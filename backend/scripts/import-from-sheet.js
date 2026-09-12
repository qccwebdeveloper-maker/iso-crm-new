// Reads the "Sync Queue" Google Sheet produced by
// backend/scripts/apps-script-drive-import.gs and imports every "ready" row
// into iso-crm-new via POST /api/oldclients/import-manifest — pointed at your
// LOCAL backend by default, so nothing here needs a public server URL.
//
// The Apps Script walks Drive (no item cap, unlike the embed-scraper /drive/
// sync relies on) and writes one row per client folder with its full file
// list as a JSON blob. This script just reads that sheet and feeds it in.
//
// Setup:
//   1. Run apps-script-drive-import.gs's setup(), let it finish (see its
//      header comment for details), then share the resulting spreadsheet as
//      "Anyone with the link" -> Viewer (File -> Share in Google Sheets).
//   2. Copy the spreadsheet ID from its URL:
//      https://docs.google.com/spreadsheets/d/<THIS_PART>/edit
//   3. node backend/scripts/import-from-sheet.js <SPREADSHEET_ID>
//
// Safe to re-run: the backend dedupes by driveFolderId and by each file's
// Drive fileId, so importing the same sheet twice (or after more rows turn
// "ready") never creates duplicates — it only adds what's new.
require('dotenv').config();

const SPREADSHEET_ID = process.argv[2];
const SHEET_NAME = 'Sync Queue';
const BACKEND_URL = process.env.IMPORT_BACKEND_URL || 'http://localhost:5001';
const IMPORT_SECRET = process.env.DRIVE_IMPORT_SECRET;
const BATCH_SIZE = 25;

if (!SPREADSHEET_ID) {
  console.error('Usage: node import-from-sheet.js <SPREADSHEET_ID>');
  console.error('(the ID from the sheet\'s URL: https://docs.google.com/spreadsheets/d/<ID>/edit)');
  process.exit(1);
}
if (!IMPORT_SECRET) {
  console.error('DRIVE_IMPORT_SECRET is not set in backend/.env — the backend will reject this.');
  process.exit(1);
}

// Google's "gviz" endpoint returns JSON without needing any auth, as long as
// the sheet is shared "Anyone with the link" -> Viewer. Avoids CSV-escaping
// headaches entirely (each cell comes back as a proper JS string).
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

async function fetchSheetRows() {
  const resp = await fetch(GVIZ_URL);
  if (!resp.ok) throw new Error(`Could not read sheet (HTTP ${resp.status}) — is it shared as "Anyone with the link -> Viewer"?`);
  const text = await resp.text();
  const jsonText = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
  const parsed = JSON.parse(jsonText);
  // Columns: driveFolderId, companyName, status, documentsJson, filesFound, error, processedAt
  return parsed.table.rows.map((row) => {
    const cells = row.c.map((c) => (c ? c.v : null));
    return {
      driveFolderId: cells[0],
      companyName: cells[1],
      status: cells[2],
      documentsJson: cells[3],
    };
  });
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

async function main() {
  console.log(`Reading sheet ${SPREADSHEET_ID}...`);
  const rows = await fetchSheetRows();
  console.log(`Total rows: ${rows.length}`);

  const ready = rows.filter((r) => r.status === 'ready' && r.documentsJson);
  const notReady = rows.length - ready.length;
  console.log(`Ready to import: ${ready.length} | Not ready yet (pending/error): ${notReady}`);
  if (notReady > 0) {
    console.log('(Re-run this script later once the Apps Script trigger finishes the rest.)');
  }

  let clientsCreated = 0, clientsUpdated = 0, filesAdded = 0, errors = 0;
  for (let i = 0; i < ready.length; i += BATCH_SIZE) {
    const chunk = ready.slice(i, i + BATCH_SIZE).map((r) => ({
      driveFolderId: r.driveFolderId,
      companyName: r.companyName,
      documents: JSON.parse(r.documentsJson),
    }));
    try {
      const result = await importBatch(chunk);
      clientsCreated += result.clientsCreated;
      clientsUpdated += result.clientsUpdated;
      filesAdded += result.filesAdded;
      const batchErrors = result.results.filter((r) => r.error);
      errors += batchErrors.length;
      batchErrors.forEach((e) => console.error(`  FAILED ${e.companyName} (${e.driveFolderId}): ${e.error}`));
    } catch (err) {
      console.error(`Batch ${i}-${i + chunk.length} failed entirely: ${err.message}`);
      errors += chunk.length;
    }
    console.log(`progress: ${Math.min(i + BATCH_SIZE, ready.length)}/${ready.length} folders imported`);
  }

  console.log('\n=== DONE ===');
  console.log(`New clients created: ${clientsCreated}`);
  console.log(`Existing clients updated (new files added): ${clientsUpdated}`);
  console.log(`Total files added: ${filesAdded}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
