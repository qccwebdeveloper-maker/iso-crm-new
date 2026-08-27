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
const { resolveStandardForClientId } = require('../utils/clientId');
const { getClientCycles, getLatestCycle } = require('../utils/cycles');

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
router.get('/', protect, authorize('admin', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.formType) filter.formType = Number(req.query.formType);
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.cycle)    filter.cycleNumber = Number(req.query.cycle);

    const forms = await QMSForm.find(filter)
      .populate('clientRef', 'name company clientId email phone')
      .populate({ path: 'application', select: 'assignedAuditor assignedReviewer status', populate: { path: 'assignedAuditor assignedReviewer', select: 'name email' } })
      .sort({ updatedAt: -1 });
    res.json(forms);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Shared resolver: given a client User doc, mirror in the Application Form (F01)
// details (REFNO, full standards list, address, scope, mode of audit, …) the same
// way every QMS form does, so both the admin search and a client's own "my info"
// lookup return the identical shape.
async function resolveClientInfo(user, cycle) {
  const cid = user.clientId;

  const cycles      = await getClientCycles(cid);
  const activeCycle = cycle ? Number(cycle) : cycles[cycles.length - 1];

  const appForm = await QMSForm.findOne({ clientId: cid, formType: 1, cycleNumber: activeCycle })
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
  // Some legacy/imported F01 records saved the mobile number with the country code
  // already baked in (e.g. "+91 8867125632"), so prepending the country code again
  // below would duplicate it ("+91 +91 8867125632"). Strip it back to local digits
  // first — mirrors frontend/src/utils/phone.js's localMobileNumber().
  const ccDigits     = String(fd.countryCode  || '').replace(/\D/g, '');
  const mobileDigits = String(fd.mobileNumber || '').replace(/\D/g, '');
  const localDigits  = (ccDigits && mobileDigits.startsWith(ccDigits) && mobileDigits.length > ccDigits.length)
    ? mobileDigits.slice(ccDigits.length)
    : mobileDigits;
  const f1Phone = `${fd.countryCode || ''} ${localDigits}`.trim();
  if (fd.mobileNumber)  out.phone = f1Phone;
  // Total employees = sum of the "Effective No. Filled by QCC" column (last
  // column) of F01's employee table — used as No. of Persons under Certification.
  const empTable = Array.isArray(fd.empTable) ? fd.empTable : [];
  out.empTotal = empTable.reduce(
    (a, r) => a + (Array.isArray(r) ? (Number(r[r.length - 1]) || 0) : 0), 0
  );

  // Whether this Client ID is the smallest (original/primary) one among every OTHER
  // client account that shares this company name AND the same ISO standard. A company
  // can end up with more than one Client ID — some are genuine re-registrations/extra
  // sites under the SAME standard (only the primary one went through Initial Audit, the
  // rest are surveillance/recertification only), while others are entirely separate
  // certification tracks on a DIFFERENT standard (each gets full, independent access).
  if (out.company) {
    const escapedCompany = String(out.company).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const siblings = await User.find({
      role: 'client',
      company: new RegExp(`^${escapedCompany}$`, 'i'),
    }).select('clientId isoStandard');

    const siblingIds = siblings.map(s => s.clientId).filter(Boolean);
    const siblingForms = await QMSForm.find({ clientId: { $in: siblingIds }, formType: 1 })
      .select('clientId formData.standards');
    const standardByClientId = {};
    siblingForms.forEach(f => {
      const list = Array.isArray(f.formData?.standards) ? f.formData.standards.filter(Boolean) : [];
      if (list.length) standardByClientId[f.clientId] = list.join(', ');
    });

    const sameStandardIds = siblings
      .map(s => ({ clientId: s.clientId, standard: standardByClientId[s.clientId] || s.isoStandard || '' }))
      .filter(s => s.standard === out.isoStandard)
      .map(s => Number(s.clientId))
      .filter(n => !Number.isNaN(n))
      .sort((a, b) => a - b);

    const minId = sameStandardIds.length ? sameStandardIds[0] : null;
    out.isPrimaryClientId = minId === null || Number(cid) === minId;
    // 1-based position of this Client ID among its same-standard siblings, sorted
    // ascending — the primary (smallest) is rank 1, the next-smallest is rank 2, and
    // so on. Used to label per-Client-ID Surveillance cycles (Surveillance-1-2, …).
    const idx = sameStandardIds.indexOf(Number(cid));
    out.clientRank = idx >= 0 ? idx + 1 : 1;
  } else {
    out.isPrimaryClientId = true;
    out.clientRank = 1;
  }

  // Cycle info: how many certification cycles (Initial + Surveillances, then a new
  // one per recertification-before-expiry) exist under THIS Client ID. Distinct from
  // clientRank above, which is about legacy multi-Client-ID groupings.
  out.cycles      = cycles;
  out.cycleCount  = cycles.length;
  out.activeCycle = activeCycle;

  return out;
}

// GET /api/qms-forms/find-clients/:term — resolve a search term (Client ID or company
// name) to the matching client(s). A company name can have more than one Client ID
// (e.g. re-certifications under new IDs), so this returns an array — the caller shows
// a picker when there's more than one match, or proceeds straight through on exactly one.
router.get('/find-clients/:term', protect, authorize('admin', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const term = (req.params.term || '').trim();
    if (!term) return res.json([]);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      role: 'client',
      $or: [
        { clientId: term },
        { company: new RegExp(`^${escaped}$`, 'i') },
      ],
    }).select('name company clientId isoStandard branchLabel address');

    // Standard shown per candidate — F01's selection is authoritative when filled,
    // otherwise fall back to what was entered at registration. Lets the picker show
    // which standard each Client ID is on, so an admin can tell duplicates (same
    // standard) apart from genuinely separate certification tracks (different standard).
    const clientIds = users.map(u => u.clientId).filter(Boolean);
    const appForms = await QMSForm.find({ clientId: { $in: clientIds }, formType: 1 })
      .select('clientId formData.standards');
    const standardByClientId = {};
    appForms.forEach(f => {
      const list = Array.isArray(f.formData?.standards) ? f.formData.standards.filter(Boolean) : [];
      if (list.length) standardByClientId[f.clientId] = list.join(', ');
    });

    const companyMap = new Map();
    for (const u of users) {
      const company = u.company || u.name || 'Unknown company';
      const companyKey = company.trim().toLowerCase();
      if (!companyMap.has(companyKey)) companyMap.set(companyKey, { company, branches: new Map() });

      const group = companyMap.get(companyKey);
      const branchLabel = String(u.branchLabel || '').trim() || 'Main Branch';
      const branchKey = branchLabel.toLowerCase();
      if (!group.branches.has(branchKey)) {
        group.branches.set(branchKey, { branchLabel, address: u.address || '', clients: [] });
      }

      const cycles = await getClientCycles(u.clientId);
      const standard = standardByClientId[u.clientId] || u.isoStandard || '';
      group.branches.get(branchKey).clients.push({
        clientId: u.clientId,
        name: u.name,
        standard,
        standards: standard.split(',').map(s => s.trim()).filter(Boolean),
        cycles,
        cycleCount: cycles.length,
      });
    }

    const list = Array.from(companyMap.values()).map(group => ({
      company: group.company,
      branches: Array.from(group.branches.values()).map(branch => ({
        ...branch,
        clients: branch.clients.sort((a, b) => (Number(a.clientId) || 0) - (Number(b.clientId) || 0)),
      })),
    }));
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/qms-forms/client/:clientId — fetch client info for pre-fill
router.get('/client/:clientId', protect, authorize('admin', 'auditor', 'reviewer'), async (req, res) => {
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

    res.json(await resolveClientInfo(user, req.query.cycle));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/qms-forms/by-client/:clientId/:formType — get saved form data
router.get('/by-client/:clientId/:formType', protect, authorize('admin', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const form = await QMSForm.findOne({
      clientId: req.params.clientId,
      formType: Number(req.params.formType),
      cycleNumber: req.query.cycle ? Number(req.query.cycle) : 1,
    }).populate('clientRef', 'name company clientId email phone');
    if (!form) return res.status(404).json({ message: 'No form found' });
    res.json(form);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qms-forms — create or update (upsert by clientId + formType)
router.post('/', protect, authorize('admin', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const { clientId, formType, formCode, formName, status, formData, cycleNumber } = req.body;
    if (!clientId || !formType) {
      return res.status(400).json({ message: 'clientId and formType are required' });
    }

    const client = await User.findOne({ clientId });
    if (!client) return res.status(404).json({ message: 'No client found with this ID' });

    const cycle = cycleNumber ? Number(cycleNumber) : 1;
    const form = await QMSForm.findOneAndUpdate(
      { clientId, formType: Number(formType), cycleNumber: cycle },
      {
        clientId,
        clientRef: client._id,
        formType: Number(formType),
        cycleNumber: cycle,
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
router.post('/upload-signature', protect, authorize('admin', 'auditor', 'reviewer'), signatureUpload.single('signature'), async (req, res) => {
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

// GET /api/qms-forms/my-info — logged-in client's own resolved info (same shape as
// the admin's client lookup), used to render read-only forms (standards, refno, …)
router.get('/my-info', protect, authorize('client'), async (req, res) => {
  try {
    if (!req.user.clientId) return res.status(400).json({ message: 'No client ID linked to your account' });
    res.json(await resolveClientInfo(req.user));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/qms-forms/my — create/update logged-in client's own form
router.post('/my', protect, authorize('client'), async (req, res) => {
  try {
    if (!req.user.clientId) return res.status(400).json({ message: 'No client ID linked to your account' });
    const { formType, formCode, formName, status, formData } = req.body;
    if (!formType) return res.status(400).json({ message: 'formType is required' });
    // A client may only edit their own Application Form (F01) — every other QMS
    // form (audit plans, reports, CARs, …) is filled by the auditor/admin and is
    // view-only for the client.
    if (Number(formType) !== 1) return res.status(403).json({ message: 'You can only edit the Application Form' });

    // Clients never pick a cycle themselves — they always work in whichever cycle
    // is currently latest for their Client ID (admin/auditor advances it via
    // "Start New Cycle" when a recertification-before-expiry round begins).
    const cycle = await getLatestCycle(req.user.clientId);

    const newStatus = status || 'draft';
    const form = await QMSForm.findOneAndUpdate(
      { clientId: req.user.clientId, formType: Number(formType), cycleNumber: cycle },
      {
        clientId:  req.user.clientId,
        clientRef: req.user._id,
        formType:  Number(formType),
        cycleNumber: cycle,
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
        cycleNumber: cycle,
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
      await User.updateMany(
        { role: 'admin' },
        { $push: { notifications: { $each: [{
            message: `${req.user.name || 'A client'} submitted ${formName || 'a form'} (${req.user.clientId})`,
            type: 'info', read: false, link, createdAt: new Date(),
          }], $position: 0, $slice: 50 } } }
      );
    }

    res.json(form);
  } catch (err) {
    console.error('[POST /api/qms-forms/my]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/qms-forms/:id/assign — assign an auditor/reviewer to the client behind
// this record. Resolves (or creates) the Application that backs it, since the
// auditor/reviewer dashboards read assignments from Application.assignedAuditor —
// same mechanism as POST /api/applications/:id/assign, just entered from this list.
router.post('/:id/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { auditorId, reviewerId } = req.body;
    if (!auditorId && !reviewerId) return res.status(400).json({ message: 'Select at least one person to assign' });

    const form = await QMSForm.findById(req.params.id);
    if (!form) return res.status(404).json({ message: 'Record not found' });

    let clientUserId = form.clientRef;
    if (!clientUserId) {
      const client = await User.findOne({ clientId: form.clientId }).select('_id');
      clientUserId = client?._id || null;
    }
    if (!clientUserId) return res.status(400).json({ message: 'No client account found for this record' });

    let appId = form.application;
    if (!appId) {
      const existing = await Application.findOne({ client: clientUserId, cycleNumber: form.cycleNumber || 1 }).sort({ createdAt: -1 }).select('_id');
      if (existing) {
        appId = existing._id;
      } else {
        const fd = form.formData || {};
        const created = await Application.create({
          client:           clientUserId,
          cycleNumber:      form.cycleNumber || 1,
          organizationName: fd.organizationName || fd.orgName || '',
          isoStandard:      (Array.isArray(fd.standards) && fd.standards[0]) || fd.isoStandard || '',
        });
        appId = created._id;
        await User.findByIdAndUpdate(clientUserId, { $addToSet: { assignedApplications: appId } });
      }
      form.application = appId;
      await form.save();
    }

    const updates = { status: 'under_review' };
    if (auditorId)  updates.assignedAuditor  = auditorId;
    if (reviewerId) updates.assignedReviewer = reviewerId;
    const app = await Application.findByIdAndUpdate(appId, updates, { new: true })
      .populate('client assignedAuditor assignedReviewer', 'name email _id clientId');

    if (auditorId) {
      await User.findByIdAndUpdate(auditorId, { $addToSet: { assignedApplications: appId } });
      await User.findByIdAndUpdate(auditorId, { $push: { notifications: { $each: [{
        message: `You have been assigned to application ${app.applicationId}`, type: 'info', read: false, link: `/auditor/applications/${appId}`, createdAt: new Date(),
      }], $position: 0, $slice: 50 } } });
    }
    if (reviewerId) {
      await User.findByIdAndUpdate(reviewerId, { $addToSet: { assignedApplications: appId } });
      await User.findByIdAndUpdate(reviewerId, { $push: { notifications: { $each: [{
        message: `You have been assigned to review application ${app.applicationId}`, type: 'info', read: false, link: `/auditor/applications/${appId}`, createdAt: new Date(),
      }], $position: 0, $slice: 50 } } });
    }

    res.json({ message: 'Assigned successfully', application: app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/qms-forms/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await QMSForm.findByIdAndDelete(req.params.id);
    res.json({ message: 'Form deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
