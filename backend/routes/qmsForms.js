const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const fs       = require('fs');
const path     = require('path');
const QMSForm     = require('../models/QMSForm');
const User        = require('../models/User');
const Application = require('../models/Application');
const { protect, authorize } = require('../middleware/auth');
const { uploadToS3 } = require('../utils/s3');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const signatureUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Signature must be a PNG or JPG image'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// GET /api/qms-forms?formType=1&status=draft
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.formType) filter.formType = Number(req.query.formType);
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status)   filter.status   = req.query.status;

    const forms = await QMSForm.find(filter)
      .populate('clientRef', 'name company clientId email phone')
      .sort({ updatedAt: -1 });
    res.json(forms);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/qms-forms/client/:clientId — fetch client info for pre-fill
router.get('/client/:clientId', protect, authorize('admin'), async (req, res) => {
  try {
    // Accept either a Client ID or a company name (case-insensitive). Client ID
    // is tried first; if nothing matches, fall back to an exact company-name match.
    const term = (req.params.clientId || '').trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { clientId: term },
        { company: new RegExp(`^${escaped}$`, 'i') },
      ],
    }).select('name company email phone address isoStandard scope clientId');
    if (!user) return res.status(404).json({ message: 'No client found with this ID or company name' });

    // Resolve the real Client ID for all downstream lookups (the search term may
    // have been a company name).
    const cid = user.clientId;

    // The Application Form (F01) is the single source of truth: pull the details
    // entered there so every downstream form can auto-fetch REFNO, the full
    // standards list, address, scope and mode of audit. F01 values win over the
    // bare client record; the client record is the fallback when F01 is empty.
    const appForm = await QMSForm.findOne({ clientId: cid, formType: 1 })
      .select('formData');
    const fd = appForm?.formData || {};
    const selected = fd.standards;
    const standards = Array.isArray(selected) ? selected.filter(Boolean) : [];

    const out = user.toObject();
    out.standards = standards;
    if (standards.length)        out.isoStandard = standards.join(', ');
    out.refno         = fd.refno || '';
    out.modeOfWorking = fd.modeOfWorking || '';
    if (fd.organizationName)     out.company = fd.organizationName;
    if (fd.address)              out.address = fd.address;
    if (fd.scopeOfCertification) out.scope   = fd.scopeOfCertification;
    // Contact details — prefer what was entered in F01, fall back to the client record.
    if (fd.emailId)       out.email = fd.emailId;
    if (fd.contactPerson) out.contactPerson = fd.contactPerson;
    const f1Phone = `${fd.countryCode || ''} ${fd.mobileNumber || ''}`.trim();
    if (fd.mobileNumber)  out.phone = f1Phone;
    // Total employees = sum of the "Effective No. Filled by QCC" column (last
    // column) of F01's employee table — used as No. of Persons under Certification.
    const empTable = Array.isArray(fd.empTable) ? fd.empTable : [];
    out.empTotal = empTable.reduce(
      (a, r) => a + (Array.isArray(r) ? (Number(r[r.length - 1]) || 0) : 0), 0
    );
    res.json(out);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/qms-forms/by-client/:clientId/:formType — get saved form data
router.get('/by-client/:clientId/:formType', protect, authorize('admin'), async (req, res) => {
  try {
    const form = await QMSForm.findOne({
      clientId: req.params.clientId,
      formType: Number(req.params.formType),
    }).populate('clientRef', 'name company clientId email phone');
    if (!form) return res.status(404).json({ message: 'No form found' });
    res.json(form);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qms-forms — create or update (upsert by clientId + formType)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { clientId, formType, formCode, formName, status, formData } = req.body;
    if (!clientId || !formType) {
      return res.status(400).json({ message: 'clientId and formType are required' });
    }

    const client = await User.findOne({ clientId });
    if (!client) return res.status(404).json({ message: 'No client found with this ID' });

    const form = await QMSForm.findOneAndUpdate(
      { clientId, formType: Number(formType) },
      {
        clientId,
        clientRef: client._id,
        formType: Number(formType),
        formCode,
        formName,
        status: status || 'draft',
        formData: formData || {},
      },
      { upsert: true, new: true, runValidators: false, setDefaultsOnInsert: true }
    );
    res.json(form);
  } catch (err) {
    console.error('[POST /api/qms-forms]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/qms-forms/upload-signature — upload a signature image (PNG/JPG), returns { url }
router.post('/upload-signature', protect, authorize('admin'), signatureUpload.single('signature'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let url;
    try {
      const result = await uploadToS3(req.file.buffer, 'iso-crm/signatures', req.file.originalname, req.file.mimetype);
      url = result.secure_url;
    } catch (cloudErr) {
      console.warn('S3 unavailable, saving signature to local disk:', cloudErr.message);
      const safeName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, safeName), req.file.buffer);
      url = `/uploads/${safeName}`;
    }
    res.json({ url });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Client self-service: a client can only read/write their OWN form ───

// GET /api/qms-forms/my/:formType — logged-in client's own form (null if none yet)
router.get('/my/:formType', protect, authorize('client'), async (req, res) => {
  try {
    if (!req.user.clientId) return res.status(400).json({ message: 'No client ID linked to your account' });
    const form = await QMSForm.findOne({
      clientId: req.user.clientId,
      formType: Number(req.params.formType),
    });
    res.json(form || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qms-forms/my — create/update logged-in client's own form
router.post('/my', protect, authorize('client'), async (req, res) => {
  try {
    if (!req.user.clientId) return res.status(400).json({ message: 'No client ID linked to your account' });
    const { formType, formCode, formName, status, formData } = req.body;
    if (!formType) return res.status(400).json({ message: 'formType is required' });

    const newStatus = status || 'draft';
    const form = await QMSForm.findOneAndUpdate(
      { clientId: req.user.clientId, formType: Number(formType) },
      {
        clientId:  req.user.clientId,
        clientRef: req.user._id,
        formType:  Number(formType),
        formCode,
        formName,
        status:    newStatus,
        formData:  formData || {},
      },
      { upsert: true, new: true, runValidators: false, setDefaultsOnInsert: true }
    );

    // On submit (not draft), for the Application Form (F01), mirror the data into
    // an Application record so it appears in the admin's main Applications list.
    if (newStatus !== 'draft' && Number(formType) === 1) {
      const fd = formData || {};
      const appFields = {
        ...fd,
        isoStandard: (Array.isArray(fd.standards) && fd.standards[0]) || fd.isoStandard || '',
        scope:       fd.scopeOfCertification || fd.scope || '',
        client:      req.user._id,
        status:      'submitted',
        submittedAt: new Date(),
      };
      delete appFields._id; delete appFields.__v;
      delete appFields.createdAt; delete appFields.updatedAt;
      delete appFields.applicationId; // never overwrite an existing app id

      let app = form.application ? await Application.findById(form.application) : null;
      if (app) {
        Object.assign(app, appFields);
        await app.save();
      } else {
        app = await Application.create(appFields);
        form.application = app._id;
        await form.save();
      }

      // Keep the client's assignedApplications list in sync
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { assignedApplications: app._id } });
    }

    // Notify admins when the client submits (not on plain draft saves)
    if (newStatus !== 'draft') {
      const link   = Number(formType) === 1 ? '/admin/applications' : '/admin/qms/form-' + String(formType).padStart(2, '0');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const a of admins) {
        await User.findByIdAndUpdate(a._id, {
          $push: { notifications: { $each: [{
            message: `${req.user.name || 'A client'} submitted ${formName || 'a form'} (${req.user.clientId})`,
            type: 'info', read: false, link, createdAt: new Date(),
          }], $position: 0, $slice: 50 } }
        });
      }
    }

    res.json(form);
  } catch (err) {
    console.error('[POST /api/qms-forms/my]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/qms-forms/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await QMSForm.findByIdAndDelete(req.params.id);
    res.json({ message: 'Form deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
