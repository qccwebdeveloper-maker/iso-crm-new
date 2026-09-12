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
    // The documents array can contain hundreds of thousands of embedded
    // entries across all legacy clients. Do not send the full payload for the
    // table view; fetch a client detail via /:id when it is opened.
    const clients = await OldClient.aggregate([
      { $project: {
        companyName: 1, contactPerson: 1, phone: 1, email: 1,
        isoStandard: 1, clientId: 1, createdAt: 1, updatedAt: 1,
        documentCount: { $size: { $ifNull: ['$documents', []] } },
      } },
      { $sort: { createdAt: -1 } },
    ]);
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

// The Drive root here has ~5,500 client sub-folders, each with its own
// admin/client sub-folders — a full pass is tens of thousands of throttled
// fetches against Google's unauthenticated embed endpoint (see
// utils/googleDrive.js) and can take well over an hour. That can never fit
// inside one HTTP request/response — a browser tab or reverse proxy will
// give up long before it finishes, which is what made earlier attempts look
// like they "just stopped" partway through. So /drive/sync now only starts
// the walk and returns immediately; progress lives here in memory and is
// polled via GET /drive/sync/status.
let syncState = {
  running: false,
  foldersScanned: 0, foldersTotal: 0,
  clientsCreated: 0, clientsUpdated: 0, filesAdded: 0,
  failures: [],
  startedAt: null, finishedAt: null, error: null,
};

async function runDriveSync(rootId, adminId) {
  try {
    const topLevel = await listDriveFolder(rootId);
    const folders = topLevel.filter((e) => e.type === 'folder');
    syncState.foldersTotal = folders.length;

    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      try {
        let client = await OldClient.findOne({ driveFolderId: folder.id });
        if (!client) {
          client = await OldClient.create({ companyName: folder.name, driveFolderId: folder.id, createdBy: adminId });
          syncState.clientsCreated++;
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
          syncState.filesAdded += addedHere;
          syncState.clientsUpdated++;
        }
      } catch (folderErr) {
        // One bad/rate-limited folder must not abort the other thousands —
        // log it, record it, and keep going.
        console.error(`[drive/sync] folder "${folder.name}" (${folder.id}) failed:`, folderErr.message);
        syncState.failures.push({ folderId: folder.id, folderName: folder.name, error: folderErr.message });
      }

      syncState.foldersScanned = i + 1;
      if (i % 50 === 0 || i === folders.length - 1) {
        console.log(`[drive/sync] progress: ${i + 1}/${folders.length} folders scanned, ${syncState.clientsCreated} created, ${syncState.filesAdded} files added, ${syncState.failures.length} failed`);
      }
    }
  } catch (err) {
    console.error('[drive/sync] fatal:', err.message);
    syncState.error = err.message;
  } finally {
    syncState.running = false;
    syncState.finishedAt = new Date();
    console.log(`[drive/sync] finished: ${syncState.foldersScanned}/${syncState.foldersTotal} scanned, ${syncState.clientsCreated} created, ${syncState.filesAdded} files added, ${syncState.failures.length} failed`);
  }
}

// POST /api/oldclients/drive/sync
// Kicks off a background walk of the configured Drive root (one sub-folder
// per old client, e.g. 9026/9027/...), turning each into an OldClient record
// and attaching every file inside it as a document. Returns immediately —
// poll GET /drive/sync/status for progress. Safe to re-run/re-poll: existing
// clients are matched by driveFolderId and only newly-added Drive files get
// pushed in, so a re-run picks up where the last one left off.
router.post('/drive/sync', protect, authorize('admin'), async (req, res) => {
  if (syncState.running) return res.status(409).json({ message: 'A sync is already running', ...syncState });

  const rootId = process.env.GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID;
  if (!rootId) return res.status(400).json({ message: 'GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID is not configured' });

  syncState = {
    running: true,
    foldersScanned: 0, foldersTotal: 0,
    clientsCreated: 0, clientsUpdated: 0, filesAdded: 0,
    failures: [],
    startedAt: new Date(), finishedAt: null, error: null,
  };
  runDriveSync(rootId, req.user._id);
  res.json({ started: true, ...syncState });
});

// GET /api/oldclients/drive/sync/status — poll this while a sync runs.
router.get('/drive/sync/status', protect, authorize('admin'), (req, res) => {
  res.json(syncState);
});

// POST /api/oldclients/import-manifest
// /drive/sync (above) scrapes Google's unauthenticated embeddedfolderview page,
// which silently caps out around ~5,500 items for a folder this large — it can
// never see the full ~8,500+ real client folders here, no matter how it's
// retried. This endpoint takes a complete listing instead, produced by the
// Apps Script drive walker (backend/scripts/apps-script-drive-import.gs), which
// runs under the admin's own Google account and uses the real Drive API (no
// item cap, proper pagination). Same schema and dedup rules as /drive/sync:
// match existing clients by driveFolderId, dedupe documents by publicId — so
// running this after /drive/sync (or re-running it) never creates duplicates,
// it only fills in what the scraper couldn't see.
//
// Not admin-JWT protected — this is called by a script, not a logged-in
// browser — so it's gated by a shared secret instead (DRIVE_IMPORT_SECRET).
router.post('/import-manifest', async (req, res) => {
  if (!process.env.DRIVE_IMPORT_SECRET || req.headers['x-import-secret'] !== process.env.DRIVE_IMPORT_SECRET) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const { folders } = req.body;
    if (!Array.isArray(folders)) return res.status(400).json({ message: 'Body must be { folders: [...] }' });

    let clientsCreated = 0, clientsUpdated = 0, filesAdded = 0;
    const results = [];
    for (const f of folders) {
      if (!f || !f.driveFolderId || !f.companyName) {
        results.push({ driveFolderId: f?.driveFolderId, error: 'Missing driveFolderId or companyName' });
        continue;
      }
      try {
        let client = await OldClient.findOne({ driveFolderId: f.driveFolderId });
        if (!client) {
          client = await OldClient.create({ companyName: f.companyName, driveFolderId: f.driveFolderId });
          clientsCreated++;
        }

        const existingIds = new Set(client.documents.map((d) => d.publicId));
        let addedHere = 0;
        for (const file of (f.documents || [])) {
          if (!file?.fileId || !file?.viewUrl) continue;
          const publicId = `drive:${file.fileId}`;
          if (existingIds.has(publicId)) continue;
          const displayName = file.folderPath ? `${file.folderPath}/${file.name}` : file.name;
          client.documents.push({
            name: displayName, originalName: file.name,
            path: file.viewUrl, publicId,
            docType: guessDocType(file.name || ''), uploadedAt: new Date(),
          });
          addedHere++;
        }
        if (addedHere > 0) {
          await client.save();
          filesAdded += addedHere;
          clientsUpdated++;
        }
        results.push({ driveFolderId: f.driveFolderId, companyName: f.companyName, filesAdded: addedHere });
      } catch (err) {
        console.error(`[import-manifest] folder "${f.companyName}" (${f.driveFolderId}) failed:`, err.message);
        results.push({ driveFolderId: f.driveFolderId, companyName: f.companyName, error: err.message });
      }
    }
    res.json({ received: folders.length, clientsCreated, clientsUpdated, filesAdded, results });
  } catch (err) {
    res.status(500).json({ message: 'Import failed: ' + err.message });
  }
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
