const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const fs       = require('fs');
const path     = require('path');
const AuditorSignature = require('../models/AuditorSignature');
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

// GET /api/auditor-signatures — full roster, used to auto-fill the Signature
// column on QMS forms by matching a signatory's typed name.
router.get('/', protect, authorize('admin', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const list = await AuditorSignature.find().sort({ name: 1 });
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auditor-signatures — create or update (upsert by name) a roster entry
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, location, signatureUrl } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
    const nameKey = name.trim().toLowerCase();
    const entry = await AuditorSignature.findOneAndUpdate(
      { nameKey },
      { name: name.trim(), location: location || '', signatureUrl: signatureUrl || '' },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auditor-signatures/upload — upload a signature image (PNG/JPG), returns { url }
router.post('/upload', protect, authorize('admin'), signatureUpload.single('signature'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let url;
    try {
      const result = await uploadToS3(req.file.buffer, 'iso-crm/auditor-signatures', req.file.originalname, req.file.mimetype);
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

// DELETE /api/auditor-signatures/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await AuditorSignature.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
