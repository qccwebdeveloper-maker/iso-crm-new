const express    = require('express');
const router     = express.Router();
const path       = require('path');
const fs         = require('fs');
const bcrypt     = require('bcryptjs');
const OldClient  = require('../models/OldClient');
const User       = require('../models/User');
const upload     = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { uploadToS3, deleteFromS3 } = require('../utils/s3');
const { extractFolderId, listDriveFolder, listDriveFilesRecursive, guessDocType } = require('../utils/googleDrive');
const { generateClientId } = require('../utils/clientId');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Old-client Drive folders are named after the legacy Client ID (e.g. "9026"),
// picked up as-is into companyName by the sync until an admin renames it — reuse
// that number as the login Client ID so it matches what the client already knows.
// Falls back to minting a fresh 4-digit Client ID for records without one.
async function assignLoginClientId(oldClient) {
  if (oldClient.clientId) return oldClient.clientId;
  const guess = String(oldClient.companyName || '').trim();
  if (/^\d{3,6}$/.test(guess) && !(await User.findOne({ clientId: guess }).select('_id').lean())) {
    return guess;
  }
  return generateClientId();
}

// Creates (or returns the existing) client User account for one legacy record.
async function createLoginForOldClient(oldClient, adminId) {
  if (oldClient.linkedUser) {
    const existing = await User.findById(oldClient.linkedUser);
    if (existing) return { user: existing, created: false };
  }

  const clientId = await assignLoginClientId(oldClient);
  const password  = `${clientId}@1234`;
  const hashed    = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: oldClient.companyName,
    email: oldClient.email || `legacy${clientId}@iso-crm.local`,
    password: hashed,
    role: 'client',
    company: oldClient.companyName,
    phone: oldClient.phone,
    address: oldClient.address,
    isoStandard: oldClient.isoStandard,
    clientId,
    isLegacyClient: true,
    isActive: true,
    pendingApproval: false,
  });

  oldClient.clientId = clientId;
  oldClient.linkedUser = user._id;
  oldClient.createdBy = oldClient.createdBy || adminId;
  await oldClient.save();

  const safe = user.toObject();
  delete safe.password;
  return { user: { ...safe, _plainPassword: password }, created: true };
}

// GET /api/oldclients/me — the logged-in legacy client's own record (documents
// included). Any client account can call this; it just won't find anything
// unless it was created via create-login below.
router.get('/me', protect, authorize('client'), async (req, res) => {
  try {
    if (!req.user.clientId) return res.status(404).json({ message: 'No legacy records linked to this account' });
    const client = await OldClient.findOne({ clientId: req.user.clientId }).lean();
    if (!client) return res.status(404).json({ message: 'No legacy records linked to this account' });
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/oldclients
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const clients = await OldClient.find().sort({ createdAt: -1 }).lean();
    res.json(clients);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/oldclients/:id/create-login — mint (or fetch) a client login for one
// legacy record, so its owner can sign in with Client ID + `${clientId}@1234`.
router.post('/:id/create-login', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await OldClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Old client not found' });
    const { user, created } = await createLoginForOldClient(client, req.user._id);
    res.json({ user, created });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/oldclients/create-logins-bulk — create logins for every legacy
// record that doesn't have one yet. Safe to re-run.
router.post('/create-logins-bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const clients = await OldClient.find({ linkedUser: { $exists: false } });
    let created = 0;
    const results = [];
    for (const client of clients) {
      const { user, created: wasCreated } = await createLoginForOldClient(client, req.user._id);
      if (wasCreated) created++;
      results.push({ oldClientId: client._id, companyName: client.companyName, clientId: user.clientId });
    }
    res.json({ scanned: clients.length, created, results });
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
    // Also remove the client login (User account) tied to this record, if one
    // was created — otherwise the Client ID keeps working after "deletion".
    if (client.linkedUser) {
      try { await User.findByIdAndDelete(client.linkedUser); } catch (e) { console.warn('Linked user delete failed:', e.message); }
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
