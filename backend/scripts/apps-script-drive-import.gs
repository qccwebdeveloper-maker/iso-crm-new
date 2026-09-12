// Google Apps Script — full, uncapped listing of the "Old Clients" Shared
// Drive folder, written into a Google Sheet. A separate LOCAL script
// (backend/scripts/import-from-sheet.js) then reads that sheet and imports it
// into your local iso-crm-new database — so this Apps Script never needs to
// reach your machine or a public server URL, only Google's own services.
//
// WHY THIS EXISTS: backend/routes/oldClients.js's POST /drive/sync scrapes
// Google's unauthenticated embeddedfolderview page (see backend/utils/
// googleDrive.js) because that needs no API setup — but that page silently
// caps out around ~5,500 items for a folder this large (confirmed by direct
// testing) and simply never shows the rest, with no error. The real folder
// count here is 8,500+. DriveApp (used below) is backed by the real Drive
// API, has no such cap, and runs under your own already-authorized Google
// account — no service account, no Cloud Console project, no sharing changes
// needed, just one "Authorize" click in the browser when you first run this.
//
// SETUP (one-time):
//   1. Go to https://script.google.com -> New project.
//   2. Delete the default code, paste this whole file in.
//   3. (Nothing to configure below unless your root folder ID differs.)
//   4. In the function dropdown (top toolbar), select "setup" and click Run.
//      Approve the permission prompt (it's your own account/data, one click).
//   5. Check the Execution log — it prints a spreadsheet URL. Open it to
//      watch progress (one row per client folder: pending -> ready/error).
//      setup() also creates a time-driven trigger that calls processBatch()
//      every 5 minutes to keep working through the list (a single run can't
//      finish 8,500+ folders inside Apps Script's 6-minute execution limit).
//   6. When every row says "ready" (or "error"), the trigger deletes itself
//      and the Execution log prints "ALL DONE". Folders marked "error" can be
//      retried: run retryErrors() once.
//   7. Share the spreadsheet so your LOCAL machine can read it: File -> Share
//      -> "Anyone with the link" -> Viewer. (It only holds folder names and
//      file names/links from this archive — not credentials — but it's your
//      call.) Copy the spreadsheet's URL/ID for import-from-sheet.js.
//   8. Run backend/scripts/import-from-sheet.js locally (see that file) to
//      pull every "ready" row into your local database. Safe to re-run —
//      the backend dedupes by driveFolderId and by each file's Drive fileId.

var CONFIG = {
  ROOT_FOLDER_ID: '1K3wYbHOXhHTisOL7UL9MVzimwSaJU9Y5',
  MAX_DEPTH: 3,          // client-folder -> admin/client -> one level deeper, matches the backend scraper's depth
  MAX_RUNTIME_MS: 4.5 * 60 * 1000, // leave headroom under Apps Script's 6-minute cap
  SHEET_PROP_KEY: 'SYNC_QUEUE_SHEET_ID',
  TRIGGER_HANDLER: 'processBatch',
};

// ---- one-time setup: list every top-level client folder into a queue sheet ----
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.create('iso-crm Old Clients — Drive Import Queue');
  props.setProperty(CONFIG.SHEET_PROP_KEY, ss.getId());

  var sheet = ss.getSheets()[0];
  sheet.setName('Sync Queue');
  sheet.appendRow(['driveFolderId', 'companyName', 'status', 'documentsJson', 'filesFound', 'error', 'processedAt']);

  var root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  var iter = root.getFolders();
  var rows = [];
  while (iter.hasNext()) {
    var f = iter.next();
    rows.push([f.getId(), f.getName(), 'pending', '', '', '', '']);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  deleteExistingTriggers_();
  ScriptApp.newTrigger(CONFIG.TRIGGER_HANDLER).timeBased().everyMinutes(5).create();

  Logger.log('Queued ' + rows.length + ' client folders.');
  Logger.log('Progress sheet: ' + ss.getUrl());
  Logger.log('processBatch() will now run automatically every 5 minutes.');

  // Kick off the first batch immediately instead of waiting 5 minutes.
  processBatch();
}

// ---- resets any "error" rows back to "pending" so the next tick retries them ----
function retryErrors() {
  var sheet = getQueueSheet_();
  var data = sheet.getDataRange().getValues();
  var changed = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === 'error') {
      sheet.getRange(i + 1, 3).setValue('pending');
      sheet.getRange(i + 1, 6).setValue('');
      changed++;
    }
  }
  Logger.log('Reset ' + changed + ' error rows to pending.');
  if (changed > 0 && !hasTrigger_()) {
    ScriptApp.newTrigger(CONFIG.TRIGGER_HANDLER).timeBased().everyMinutes(5).create();
  }
}

// ---- does the actual work, called by the time-driven trigger every 5 min ----
// Columns: [driveFolderId, companyName, status, documentsJson, filesFound, error, processedAt]
function processBatch() {
  var startTime = Date.now();
  var sheet = getQueueSheet_();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (Date.now() - startTime > CONFIG.MAX_RUNTIME_MS) break;
    if (data[i][2] !== 'pending') continue;

    var driveFolderId = data[i][0];
    try {
      var folder = DriveApp.getFolderById(driveFolderId);
      var documents = listFilesRecursive_(folder, CONFIG.MAX_DEPTH, []);
      data[i][2] = 'ready';
      data[i][3] = JSON.stringify(documents);
      data[i][4] = documents.length;
      data[i][5] = '';
    } catch (err) {
      data[i][2] = 'error';
      data[i][5] = String(err).slice(0, 300);
    }
    data[i][6] = new Date();
  }

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

  var stillPending = false;
  for (var j = 1; j < data.length; j++) {
    if (data[j][2] === 'pending') { stillPending = true; break; }
  }

  if (!stillPending) {
    deleteExistingTriggers_();
    Logger.log('ALL DONE — every folder is ready or error. Run retryErrors() if any show "error".');
    Logger.log('Now run backend/scripts/import-from-sheet.js locally to load this into your database.');
  } else {
    Logger.log('Batch complete, more pending rows remain — next trigger tick will continue.');
  }
}

// Mirrors backend/utils/googleDrive.js's listDriveFilesRecursive, but backed
// by the real Drive API (DriveApp) instead of scraping — no item cap.
function listFilesRecursive_(folder, depth, pathPrefix) {
  var files = [];
  var fileIter = folder.getFiles();
  while (fileIter.hasNext()) {
    var file = fileIter.next();
    files.push({
      fileId: file.getId(),
      name: file.getName(),
      viewUrl: file.getUrl(),
      folderPath: pathPrefix.join('/'),
    });
  }
  if (depth > 0) {
    var folderIter = folder.getFolders();
    while (folderIter.hasNext()) {
      var sub = folderIter.next();
      files = files.concat(listFilesRecursive_(sub, depth - 1, pathPrefix.concat([sub.getName()])));
    }
  }
  return files;
}

function getQueueSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(CONFIG.SHEET_PROP_KEY);
  if (!id) throw new Error('No queue sheet found — run setup() first.');
  return SpreadsheetApp.openById(id).getSheetByName('Sync Queue');
}

function hasTrigger_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === CONFIG.TRIGGER_HANDLER; });
}

function deleteExistingTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === CONFIG.TRIGGER_HANDLER) ScriptApp.deleteTrigger(t);
  });
}
