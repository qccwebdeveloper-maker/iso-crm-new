const express     = require('express');
const router      = express.Router();
const path        = require('path');
const fs          = require('fs');
const Application = require('../models/Application');
const Document    = require('../models/Document');
const User        = require('../models/User');
const upload      = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { uploadToS3 } = require('../utils/s3');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const populate = [
  { path: 'client',           select: '-password' },
  { path: 'assignedAuditor',  select: '-password' },
  { path: 'assignedReviewer', select: '-password' },
  { path: 'feedbacks.from',   select: 'name role email' },
];

const pushNotif = async (userId, message, type = 'info', link = null) => {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, {
    $push: { notifications: { $each: [{ message, type, read: false, link, createdAt: new Date() }], $position: 0, $slice: 50 } }
  });
};

// Same notification, pushed to every admin in one query instead of one per admin
const notifyAdmins = async (message, type = 'info', link = null) => {
  await User.updateMany(
    { role: 'admin' },
    { $push: { notifications: { $each: [{ message, type, read: false, link, createdAt: new Date() }], $position: 0, $slice: 50 } } }
  );
};

// GET /api/applications
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'client')   filter.client          = req.user._id;
    if (req.user.role === 'auditor')  filter.assignedAuditor = req.user._id;
    if (req.user.role === 'reviewer') filter.assignedReviewer = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    const apps = await Application.find(filter).populate(populate).sort({ createdAt: -1 }).lean();
    res.json(apps);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/applications/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).populate(populate).lean();
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json(app);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications
router.post('/', protect, authorize('client', 'admin', 'sales'), async (req, res) => {
  try {
    // Client always owns their own application; admin/sales can assign to another client
    const clientId = req.user.role === 'client'
      ? req.user._id
      : (req.body.client || null);

    // Strip unknown/problem fields before saving
    const body = { ...req.body };
    delete body.__v;
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const app = await Application.create({ ...body, client: clientId });

    // Add to client's assignedApplications list
    if (clientId) {
      await User.findByIdAndUpdate(clientId, { $addToSet: { assignedApplications: app._id } });
    }

    // Notify admins
    await notifyAdmins(`New application created: ${app.applicationId}`, 'info', `/admin/applications/${app._id}`);

    // If client creates their own app, notify them too
    if (req.user.role === 'client') {
      await pushNotif(req.user._id, `Your application ${app.applicationId} has been saved as draft. Submit when ready.`, 'info', `/client/applications/${app._id}`);
    }

    res.status(201).json(app);
  } catch (err) {
    console.error('Application create error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/applications/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.__v; delete body._id; delete body.createdAt; delete body.updatedAt;

    const app = await Application.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: false }).populate(populate);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // If client field changed, update user's assignedApplications
    if (body.client) {
      await User.findByIdAndUpdate(body.client, { $addToSet: { assignedApplications: app._id } });
    }

    res.json(app);
  } catch (err) {
    console.error('Application update error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Application deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/submit
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { status: 'submitted', submittedAt: new Date(), $push: { progressStages: 'submitted' } },
      { returnDocument: 'after' }
    ).populate(populate);
    if (!app) return res.status(404).json({ message: 'Not found' });
    await notifyAdmins(`New application submitted: ${app.applicationId} by ${app.client?.name || 'client'}`, 'info', `/admin/applications/${app._id}`);
    res.json({ message: 'Application submitted', app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/assign
router.post('/:id/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { auditorId, reviewerId } = req.body;
    if (!auditorId && !reviewerId) return res.status(400).json({ message: 'Select at least one person to assign' });

    const updates = { status: 'under_review' };
    if (auditorId)  updates.assignedAuditor  = auditorId;
    if (reviewerId) updates.assignedReviewer = reviewerId;

    const app = await Application.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' }).populate(populate);
    if (!app) return res.status(404).json({ message: 'Not found' });

    if (auditorId) {
      await User.findByIdAndUpdate(auditorId, { $addToSet: { assignedApplications: app._id } });
      await pushNotif(auditorId, `You have been assigned to application ${app.applicationId}`, 'info', `/auditor/applications/${app._id}`);
      await pushNotif(app.client?._id, `An auditor has been assigned to your application ${app.applicationId}`, 'info', `/client/applications/${app._id}`);
    }
    if (reviewerId) {
      await User.findByIdAndUpdate(reviewerId, { $addToSet: { assignedApplications: app._id } });
      await pushNotif(reviewerId, `You have been assigned to review application ${app.applicationId}`, 'info', `/auditor/applications/${app._id}`);
    }
    res.json({ message: 'Assigned successfully', app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/applications/:id/status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updates = { status };
    if (notes) {
      if (req.user.role === 'auditor')       updates.auditNotes  = notes;
      else if (req.user.role === 'reviewer') updates.reviewNotes = notes;
      else                                   updates.adminNotes  = notes;
    }
    const app = await Application.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' }).populate(populate);
    if (!app) return res.status(404).json({ message: 'Not found' });
    await pushNotif(app.client?._id, `Your application ${app.applicationId} status updated to: ${status}${notes ? '. Note: ' + notes : ''}`, 'info', `/client/applications/${app._id}`);
    res.json({ message: 'Status updated', app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/upload
router.post('/:id/upload', protect, upload.single('document'), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).populate('client', 'clientId name');
    if (!app) return res.status(404).json({ message: 'Not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const docType = req.body.docType || 'document';
    const folder  = 'iso-crm/documents';

    let cloudUrl = null, publicId = null, storageUrl = null, s3Key = null;
    try {
      const result = await uploadToS3(req.file.buffer, folder, req.file.originalname, req.file.mimetype);
      cloudUrl   = result.secure_url;
      publicId   = result.public_id;
      s3Key      = result.s3_key;
      storageUrl = result.storage_url;
    } catch (cloudErr) {
      console.warn('S3 unavailable, saving to local disk:', cloudErr.message);
      const safeName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, safeName), req.file.buffer);
      cloudUrl = `/uploads/${safeName}`;
      publicId = safeName;
    }

    const namedTypes = ['applicationForm', 'agreement', 'signedForm', 'auditReport', 'reviewReport', 'proofId'];
    if (namedTypes.includes(docType)) {
      app[docType] = cloudUrl;
    } else if (docType === 'certificate') {
      app.certificate = { url: cloudUrl, issuedAt: new Date() };
    } else {
      app.uploadedDocuments.push({
        name: req.file.originalname, originalName: req.file.originalname,
        path: cloudUrl, publicId,
        docType, uploadedBy: req.user._id, uploadedAt: new Date(),
      });
    }
    await app.save();

    // Log to DMS
    await Document.create({
      name: req.file.originalname, originalName: req.file.originalname,
      path: cloudUrl, publicId, s3Key, storageUrl, docType,
      applicationId: app.applicationId, application: app._id,
      clientId: app.client?.clientId, client: app.client?._id,
      uploadedBy: req.user._id, uploadedByName: req.user.name,
      fileSize: req.file.size, mimeType: req.file.mimetype,
    });

    const updated = await Application.findById(req.params.id).populate(populate);
    res.json({ message: 'File uploaded', path: cloudUrl, app: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/payment
router.post('/:id/payment', protect, authorize('admin'), async (req, res) => {
  try {
    const { paymentStatus, paymentAmount } = req.body;
    const updates = {
      paymentStatus,
      paymentAmount: parseInt(paymentAmount) || 0,
      paymentDate: paymentStatus === 'received' ? new Date() : null,
    };
    const app = await Application.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' }).populate(populate);
    if (!app) return res.status(404).json({ message: 'Not found' });
    if (paymentStatus === 'received') {
      await pushNotif(app.client?._id, `Payment received for application ${app.applicationId}. Amount: â‚¹${paymentAmount}`, 'success', `/client/applications/${app._id}`);
    }
    res.json({ message: 'Payment updated', app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/feedback
router.post('/:id/feedback', protect, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Not found' });
    app.feedbacks.push({ from: req.user._id, role: req.user.role, message: req.body.message, rating: req.body.rating || 5 });
    await app.save();
    await notifyAdmins(`New feedback on ${app.applicationId} from ${req.user.role}`, 'info', `/admin/applications/${app._id}`);
    res.json({ message: 'Feedback submitted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/accept-audit
router.post('/:id/accept-audit', protect, authorize('auditor', 'reviewer'), async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { auditAcceptanceStatus: req.body.status, auditAcceptedDate: new Date() },
      { returnDocument: 'after' }
    ).populate(populate);
    if (!app) return res.status(404).json({ message: 'Not found' });
    await notifyAdmins(`${req.user.role} ${req.user.name} ${req.body.status} assignment for ${app.applicationId}`, 'info', `/admin/applications/${app._id}`);
    res.json({ message: `Audit ${req.body.status}`, app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/applications/:id/send-document
// Accepts both JSON and multipart/form-data (with optional file)
router.post('/:id/send-document', protect, upload.single('document'), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).populate('client assignedAuditor assignedReviewer', 'name email _id clientId');
    if (!app) return res.status(404).json({ message: 'Not found' });

    const message = req.body.message || '';
    const sendTo  = req.body.sendTo || 'client';
    let fileUrl   = null;

    // Upload file to Cloudinary if one was attached
    if (req.file) {
      try {
        const result = await uploadToS3(req.file.buffer, 'iso-crm/documents', req.file.originalname, req.file.mimetype);
        fileUrl = result.secure_url;
        const s3Key = result.s3_key, storageUrl = result.storage_url;

        // Save the document to the uploadedDocuments array and DMS
        const docType = req.body.docType || 'document';
        app.uploadedDocuments.push({
          name: req.file.originalname, originalName: req.file.originalname,
          path: fileUrl, publicId: result.public_id,
          docType, uploadedBy: req.user._id, uploadedAt: new Date(),
        });
        await app.save();

        await Document.create({
          name: req.file.originalname, originalName: req.file.originalname,
          path: fileUrl, publicId: result.public_id, s3Key, storageUrl, docType,
          applicationId: app.applicationId, application: app._id,
          clientId: app.client?.clientId, client: app.client?._id,
          uploadedBy: req.user._id, uploadedByName: req.user.name,
          fileSize: req.file.size, mimeType: req.file.mimetype,
        });
      } catch (cloudErr) {
        console.warn('[S3] upload failed, saving locally:', cloudErr.message);
        const safeName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeName), req.file.buffer);
        fileUrl = `/uploads/${safeName}`;
        const docType = req.body.docType || 'document';
        app.uploadedDocuments.push({
          name: req.file.originalname, originalName: req.file.originalname,
          path: fileUrl, publicId: safeName,
          docType, uploadedBy: req.user._id, uploadedAt: new Date(),
        });
        await app.save();
        await Document.create({
          name: req.file.originalname, originalName: req.file.originalname,
          path: fileUrl, publicId: safeName, docType,
          applicationId: app.applicationId, application: app._id,
          clientId: app.client?.clientId, client: app.client?._id,
          uploadedBy: req.user._id, uploadedByName: req.user.name,
          fileSize: req.file.size, mimeType: req.file.mimetype,
        });
      }
    }

    const baseMsg = message
      ? `Message for ${app.applicationId}: ${message}`
      : `New document shared for application ${app.applicationId}`;
    const fullMsg = fileUrl ? `${baseMsg} â€” File: ${req.file.originalname}` : baseMsg;

    // Notify the correct recipient(s)
    if (sendTo === 'client'   && app.client)          await pushNotif(app.client._id,          fullMsg, 'info', `/client/applications/${app._id}`);
    if (sendTo === 'auditor'  && app.assignedAuditor)  await pushNotif(app.assignedAuditor._id,  fullMsg, 'info', `/auditor/applications/${app._id}`);
    if (sendTo === 'reviewer' && app.assignedReviewer) await pushNotif(app.assignedReviewer._id, fullMsg, 'info', `/auditor/applications/${app._id}`);

    res.json({ message: `Document sent to ${sendTo}`, fileUrl });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

