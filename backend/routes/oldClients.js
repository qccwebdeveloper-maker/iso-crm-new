const express    = require('express');
const router     = express.Router();
const path       = require('path');
const fs         = require('fs');
const OldClient  = require('../models/OldClient');
const upload     = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { uploadToS3, deleteFromS3 } = require('../utils/s3');
const { extractFolderId, listDriveFolder, listDriveFilesRecursive, guessDocType } = require('../utils/googleDrive');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// GET /api/oldclients
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const clients = await OldClient.find().sort({ createdAt: -1 }).lean();
    res.json(clients);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/oldclients/drive/browse?folderId=<id or full URL>
// Browses the legacy-client Google Drive tree (no folderId = the configured
// root, one sub-folder per old client). Read-only, public-link listing —
// see utils/googleDrive.js.
router.get('/drive/browse', protect, authorize('admin'), async (req, res) => {
  try {
    const rootId = process.env.GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID;
    const folderId = extractFolderId(req.query.folderId) || rootId;
    if (!folderId) return res.status(400).json({ message: 'GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID is not configured' });
    const entries = await listDriveFolder(folderId);
    res.json({ folderId, entries });
  } catch (err) { res.status(500).json({ message: 'Could not read Google Drive folder: ' + err.message }); }
});

// POST /api/oldclients/drive/sync
// Turns each top-level sub-folder of the configured Drive root (one per old
// client, e.g. 9026/9027/...) into an OldClient record, and attaches every
// file inside it as a document. Safe to re-run: existing clients are matched
// by driveFolderId and only newly-added Drive files get pushed in.
router.post('/drive/sync', protect, authorize('admin'), async (req, res) => {
  try {
    const rootId = process.env.GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID;
    if (!rootId) return res.status(400).json({ message: 'GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID is not configured' });

    const topLevel = await listDriveFolder(rootId);
    const folders = topLevel.filter((e) => e.type === 'folder');

    let clientsCreated = 0, clientsUpdated = 0, filesAdded = 0;
    for (const folder of folders) {
      let client = await OldClient.findOne({ driveFolderId: folder.id });
      if (!client) {
        client = await OldClient.create({ companyName: folder.name, driveFolderId: folder.id, createdBy: req.user._id });
        clientsCreated++;
      }

      const existingIds = new Set(client.documents.map((d) => d.publicId));
      const files = await listDriveFilesRecursive(folder.id);
      let addedHere = 0;
      for (const file of files) {
        const publicId = `drive:${file.id}`;
        if (existingIds.has(publicId)) continue;
        const displayName = file.folderPath ? `${file.folderPath}/${file.name}` : file.name;
        client.documents.push({
          name: displayName, originalName: file.name,
          path: file.viewUrl, publicId,
          docType: guessDocType(file.name), uploadedAt: new Date(),
        });
        addedHere++;
      }
      if (addedHere > 0) {
        await client.save();
        filesAdded += addedHere;
        clientsUpdated++;
      }
    }
    res.json({ foldersScanned: folders.length, clientsCreated, clientsUpdated, filesAdded });
  } catch (err) { res.status(500).json({ message: 'Drive sync failed: ' + err.message }); }
});

// GET /api/oldclients/:id
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await OldClient.findById(req.params.id).lean();
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/oldclients
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName) return res.status(400).json({ message: 'Company name is required' });
    const client = await OldClient.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/oldclients/:id
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await OldClient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/oldclients/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await OldClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    for (const doc of client.documents) {
      if (doc.publicId && doc.publicId.includes('/')) {
        try { await deleteFromS3(doc.publicId); } catch (e) { console.warn('S3 delete failed:', e.message); }
      }
    }
    await client.deleteOne();
    res.json({ message: 'Old client deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/oldclients/:id/upload
router.post('/:id/upload', protect, authorize('admin'), upload.single('document'), async (req, res) => {
  try {
    const client = await OldClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const docType = req.body.docType || 'other';
    let cloudUrl = null, publicId = null;
    try {
      const result = await uploadToS3(req.file.buffer, 'iso-crm/old-clients', req.file.originalname, req.file.mimetype);
      cloudUrl = result.secure_url;
      publicId = result.public_id;
    } catch (cloudErr) {
      console.warn('S3 unavailable, saving to local disk:', cloudErr.message);
      const safeName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, safeName), req.file.buffer);
      cloudUrl = `/uploads/${safeName}`;
      publicId = safeName;
    }

    client.documents.push({
      name: req.file.originalname, originalName: req.file.originalname,
      path: cloudUrl, publicId, docType, uploadedAt: new Date(),
    });
    await client.save();
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/oldclients/:id/import-drive-file
// Attaches a file already sitting in the legacy Google Drive tree as a
// document, without downloading/re-uploading it — it just links out to the
// existing Drive file (kept as the source of truth for these old records).
router.post('/:id/import-drive-file', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await OldClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    const { fileId, name, docType, viewUrl } = req.body;
    if (!fileId || !viewUrl) return res.status(400).json({ message: 'fileId and viewUrl are required' });

    client.documents.push({
      name: name || fileId, originalName: name || fileId,
      path: viewUrl, publicId: `drive:${fileId}`,
      docType: docType || 'other', uploadedAt: new Date(),
    });
    await client.save();
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/oldclients/:id/documents/:docId
router.delete('/:id/documents/:docId', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await OldClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    const doc = client.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.publicId && doc.publicId.includes('/')) {
      try { await deleteFromS3(doc.publicId); } catch (e) { console.warn('S3 delete failed:', e.message); }
    }
    doc.deleteOne();
    await client.save();
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
