// Full, uncapped import of the "Old Clients" Drive folder using the REAL
// Google Drive API v3 (via a service account) — the alternative to
// apps-script-drive-import.gs + import-from-sheet.js for people who'd rather
// go through Google Cloud Console than paste code into script.google.com.
// Same destination as both of those: POST /api/oldclients/import-manifest,
// so results are identical and de-duplicated the same way no matter which
// import method (embed-scraper /drive/sync, Apps Script+Sheet, or this) was
// used before or after it.
//
// WHY A SERVICE ACCOUNT (not OAuth / your own login): this is a one-shot,
// unattended, long-running script (walks 8,500+ folders) — a service account
// authenticates with a downloaded key file, no browser/consent step, and no
// token to refresh mid-run. Its one requirement: a service account has no
// Drive storage of its own, so it can only see files/folders explicitly
// shared with it — hence sharing the root folder with its email below.
//
// ONE-TIME GOOGLE CLOUD SETUP:
//   1. https://console.cloud.google.com -> pick or create a project.
//   2. APIs & Services -> Library -> search "Google Drive API" -> Enable.
//   3. IAM & Admin -> Service Accounts -> Create Service Account
//      (any name, e.g. "drive-import"; no roles need to be granted — Drive
//      API access comes from sharing, not IAM roles).
//   4. Open the new service account -> Keys tab -> Add Key -> Create new key
//      -> JSON. This downloads a .json key file — save it somewhere OUTSIDE
//      the git repo, e.g. backend/secrets/drive-import-key.json (gitignored).
//   5. Copy the service account's email (looks like
//      drive-import@<project>.iam.gserviceaccount.com — also in that JSON
//      file as "client_email").
//   6. In Google Drive, open the "Old Clients" root folder -> Share -> paste
//      that email in -> Viewer access. (If it's a Shared Drive rather than a
//      folder in someone's My Drive: open the Shared Drive -> Manage members
//      -> add that email as a member with Viewer/Content Manager access —
//      sharing just one folder inside a Shared Drive isn't enough.)
//   7. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE in backend/.env to that JSON
//      file's path (or GOOGLE_APPLICATION_CREDENTIALS, the standard Google
//      env var name — either works, see below).
//
// Usage: node backend/scripts/drive-api-import.js
// Safe to re-run/resume: the backend dedupes by driveFolderId and by each
// file's Drive fileId, so a re-run (e.g. after a crash, or picking up new
// Drive files added later) only pushes in what's new.
require('dotenv').config();
const path = require('path');
const { google } = require('googleapis');

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID;
const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const BACKEND_URL = process.env.IMPORT_BACKEND_URL || 'http://localhost:5001';
const IMPORT_SECRET = process.env.DRIVE_IMPORT_SECRET;
const MAX_DEPTH = 3; // client folder -> admin/client sub-folders -> files
// Client folders are scanned this many at a time instead of one-by-one — the
// original sequential walk left almost all of the run waiting on network
// round-trips one at a time, while Drive API's per-user quota has plenty of
// headroom for concurrent reads. listFilesRecursive's own sub-folder fan-out
// (below) adds further parallelism on top of this.
const CONCURRENCY = 15;

if (!ROOT_FOLDER_ID) { console.error('GOOGLE_DRIVE_OLD_CLIENTS_FOLDER_ID is not set in backend/.env'); process.exit(1); }
if (!KEY_FILE) { console.error('Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE (or GOOGLE_APPLICATION_CREDENTIALS) in backend/.env to your service account JSON key path'); process.exit(1); }
if (!IMPORT_SECRET) { console.error('DRIVE_IMPORT_SECRET is not set in backend/.env — the backend will reject this.'); process.exit(1); }

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(KEY_FILE),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// List one folder's direct children, paging through all results. Retries
// with backoff on rate-limit/transient errors (403/429/5xx) instead of
// failing the whole run over one flaky request.
async function listChildren(folderId) {
  const items = [];
  let pageToken;
  do {
    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink)',
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
        });
        break;
      } catch (err) {
        const status = err?.code || err?.response?.status;
        if (attempt >= 4 || !(status === 403 || status === 429 || status >= 500)) throw err;
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
    items.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return items;
}

// Mirrors backend/utils/googleDrive.js's listDriveFilesRecursive: walk down
// admin/client sub-folders, tagging each file with the sub-folder path it
// came from so files with the same name in different sub-folders don't clash.
// Sub-folders are walked in parallel (Promise.all) rather than one at a time —
// each client folder only has a couple of these, but across thousands of
// client folders scanned concurrently that sequential wait added up.
async function listFilesRecursive(folderId, maxDepth = MAX_DEPTH, pathPrefix = []) {
  const children = await listChildren(folderId);
  const parts = await Promise.all(children.map(async (entry) => {
    if (entry.mimeType === FOLDER_MIME) {
      if (maxDepth <= 0) return [];
      return listFilesRecursive(entry.id, maxDepth - 1, [...pathPrefix, entry.name]);
    }
    return [{
      fileId: entry.id,
      name: entry.name,
      viewUrl: entry.webViewLink || `https://drive.google.com/file/d/${entry.id}/view`,
      folderPath: pathPrefix.join('/'),
    }];
  }));
  return parts.flat();
}

async function importBatch(folders) {
  const resp = await fetch(`${BACKEND_URL}/api/oldclients/import-manifest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Import-Secret': IMPORT_SECRET },
    body: JSON.stringify({ folders }),
  });
  if (!resp.ok) throw new Error(`Backend returned HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return resp.json();
}

// Runs `fn` over `items` with at most `limit` in flight at once. Each worker
// grabs the next unclaimed index in a shared counter — plain synchronous
// increments, so no lock is needed even though workers interleave via await.
async function mapWithConcurrency(items, limit, fn) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function main() {
  console.log(`Listing top-level client folders under ${ROOT_FOLDER_ID}...`);
  const topLevel = await listChildren(ROOT_FOLDER_ID);
  const clientFolders = topLevel.filter((e) => e.mimeType === FOLDER_MIME);
  console.log(`Found ${clientFolders.length} client folders. Walking each one (this takes a while for 8,500+)...`);

  let clientsCreated = 0, clientsUpdated = 0, filesAdded = 0, errors = 0;
  let scanned = 0;

  // Each worker scans one folder then immediately imports just that folder
  // (a "batch" of 1) — with CONCURRENCY workers running at once this already
  // overlaps many folders' worth of network time, so there's no need to
  // coordinate a shared batch buffer across workers (which would need its
  // own locking to flush safely under concurrency).
  await mapWithConcurrency(clientFolders, CONCURRENCY, async (folder) => {
    try {
      const documents = await listFilesRecursive(folder.id);
      const result = await importBatch([{ driveFolderId: folder.id, companyName: folder.name, documents }]);
      clientsCreated += result.clientsCreated;
      clientsUpdated += result.clientsUpdated;
      filesAdded += result.filesAdded;
      const batchErrors = result.results.filter((r) => r.error);
      errors += batchErrors.length;
      batchErrors.forEach((e) => console.error(`  FAILED ${e.companyName} (${e.driveFolderId}): ${e.error}`));
    } catch (err) {
      console.error(`  FAILED ${folder.name} (${folder.id}): ${err.message}`);
      errors++;
    }
    scanned++;
    if (scanned % 50 === 0 || scanned === clientFolders.length) {
      console.log(`progress: ${scanned}/${clientFolders.length} folders scanned`);
    }
  });

  console.log('\n=== DONE ===');
  console.log(`New clients created: ${clientsCreated}`);
  console.log(`Existing clients updated (new files added): ${clientsUpdated}`);
  console.log(`Total files added: ${filesAdded}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
