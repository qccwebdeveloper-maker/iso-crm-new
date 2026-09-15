// For every OldClient record missing a real company name (folder names that
// were just numbers, e.g. "9061"), an ISO standard, or a phone number, this
// downloads its attached documents (via the same Drive API service account
// as drive-api-import.js) and tries to read those three things straight out
// of the document content — no manual data entry for ~8,000 legacy records.
//
// Fast text formats are tried before slow OCR, and a client's remaining
// documents are skipped as soon as all three fields are found, so most
// clients never need OCR at all:
//   1. .pdf         -> pdf-parse (embedded text layer; scanned-image-only
//                      PDFs have no text layer and yield nothing here)
//   2. .docx/.docm  -> mammoth
//   3. .xlsx        -> xlsx (already a project dependency)
//   4. images       -> Tesseract OCR (tesseract.js) — the slow path, tried
//      (jpg/jpeg/jfif/png/webp)   last and only if still missing something
// Other extensions (.doc, .download, .enc, .zip, .mp4, .css, .html, .url —
// legacy Drive export noise) aren't text-extractable by any of the above and
// are skipped.
//
// Documents are tried in an order biased toward ones likely to actually
// carry these details (docType from the original import: gstCertificate,
// certificate, agreement first; "other" last).
//
// Safe to re-run: only fields that are still missing get overwritten, and a
// client with nothing missing is skipped entirely without downloading
// anything for it.
//
// Usage: node backend/scripts/enrich-old-clients-from-documents.js [--limit N]
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { createWorker } = require('tesseract.js');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OldClient = require('../models/OldClient');

// Tesseract.js reports some image-read failures (corrupt/truncated files,
// unsupported formats) as an error emitted from its internal worker-thread
// message handler — that lands outside the try/catch around
// worker.recognize() and would otherwise crash the whole multi-hour run over
// one bad file among tens of thousands. Log and keep going instead.
process.on('uncaughtException', (err) => console.error('  uncaught exception (skipped):', err?.message || err));
process.on('unhandledRejection', (err) => console.error('  unhandled rejection (skipped):', err?.message || err));

const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
// Mostly I/O-bound (Drive downloads) now that OCR is a last resort (see
// sortDocs) — higher than a CPU-bound job would tolerate, since only a
// minority of lanes are ever doing actual OCR at once.
const CONCURRENCY = 20;
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : null;
})();

if (!KEY_FILE) { console.error('GOOGLE_SERVICE_ACCOUNT_KEY_FILE is not set in backend/.env'); process.exit(1); }

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(KEY_FILE),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const NUMERIC_NAME = /^\s*\d[\d ,\-/]*\s*$/;
const PHONE_RE = /(?:\+?91[-\s]?)?([6-9]\d{9})\b/;
// Deliberately conservative — the first test run showed generic words like
// "Services"/"International"/"Works" false-triggering on certificate scope
// sentences ("EAS is member of International Accreditation Forum...") and
// on scope-of-certification lines, not actual company names. Only suffixes
// that are near-exclusively part of a legal company name are kept.
const NAME_HINT_RE = /\b(Pvt\.?\s*Ltd\.?|Private\s+Limited|LLP|Ltd\.?|Limited|Industries|Enterprises|Corporation|Corp\.?|Traders|Mills|Textiles?|Pharmaceuticals?|Fabricators?)\b/i;
const CONNECTOR_WORDS = new Set(['and', 'of', 'in', 'the', 'for', 'to', 'is', 'are', 'on', 'with', 'a', 'an', 'by', 'as']);
function looksLikeSentence(line) {
  const words = line.toLowerCase().split(/\s+/);
  return words.filter((w) => CONNECTOR_WORDS.has(w)).length >= 2 || line.includes(',');
}

// Several of the imported documents were named by hand using this org's own
// internal convention, which embeds the real company name directly in the
// filename — far more reliable than guessing from OCR'd document body text,
// and needs no download at all. Checked first, before any document content.
const FILENAME_NAME_PATTERNS = [
  /^\d{3,6}_+IN_+(.+?)\.(?:docx?|xlsx)$/i,
  /^\d{3,6}_+Q_?MS\s*(.+?)\.(?:docx?|xlsx)$/i,
  /^(.+?)-\d{3,6}-(?:QMS|EMS|OHSMS|FSMS)\.(?:docx?|xlsx)$/i,
  /^Audit Report[\s-]+(.+?)[\s-]+(?:QMS|EMS|OHSMS|FSMS)/i,
];
function nameFromFilename(fileName) {
  const base = (fileName || '').split('/').pop();
  for (const re of FILENAME_NAME_PATTERNS) {
    const m = base.match(re);
    if (m && m[1] && m[1].trim().length >= 4) {
      // Some filenames carry a second, unrelated ID before the real name
      // (e.g. "6116_IN_5445_NATIONAL ARCHIVES...") — strip a leftover
      // leading "<digits>_" the same way the main pattern already stripped
      // the first one.
      return m[1].trim().replace(/^\d{3,6}_+/, '').replace(/_+/g, ' ').replace(/\s{2,}/g, ' ');
    }
  }
  return null;
}

// Scanned application forms often have a numbered/labelled field ("1. Legal
// Name: ACME PVT LTD") that OCR runs together without the space the label
// and value had on paper ("1.Legal NameACME PVT LTD") — strip that label
// prefix so only the actual name is kept.
const LABEL_PREFIX_RE = /^\s*(?:\d+[.)]\s*)?(?:legal\s*name|company\s*name|organi[sz]ation\s*name|name\s*of\s*(?:the\s*)?(?:organi[sz]ation|company|applicant)|m\/s\.?)\s*[:\-]?\s*/i;

// Some attached files are generic multi-standard reference sheets reused
// across every client (seen as "ST-1.xlsx"/"ST-2.xlsx" — a big checklist
// whose header row lists ALL standards this org certifies: "ISO 9001:2015,
// ISO 14001:2015, ISO 45001:2018, ... ISO 27001:2022"), not that specific
// client's actual certified standard. Blindly taking the first ISO match in
// such a file mislabels an ISMS client as 9001 just because 9001 happens to
// be listed first. Guard: if two DIFFERENT standard codes appear within a
// short span of each other, treat that as a listing/template, not an answer.
function isoStandardFrom(text) {
  const codeRe = /ISO\s*\/?\s*(?:IEC\s*)?(9001|14001|45001|22000|27001)(?:\s*[-:]\s*(\d{4}))?/gi;
  const matches = [...text.matchAll(codeRe)];
  for (const m of matches) {
    const nearbyDifferentCode = matches.some((other) => other !== m && other[1] !== m[1] && Math.abs(other.index - m.index) < 300);
    if (!nearbyDifferentCode) return `ISO ${m[1]}${m[2] ? ':' + m[2] : ''}`;
  }
  return null;
}

function extractFields(text) {
  const out = {};
  const isoStandard = isoStandardFrom(text);
  if (isoStandard) out.isoStandard = isoStandard;

  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) out.phone = phoneMatch[1];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length > 70 || line.length < 4) continue;
    if (NAME_HINT_RE.test(line) && !/^ISO\b/i.test(line) && !looksLikeSentence(line)) {
      const cleaned = line.replace(LABEL_PREFIX_RE, '').replace(/\s{2,}/g, ' ').trim();
      if (cleaned.length >= 4) out.companyName = cleaned;
      break;
    }
  }
  return out;
}

async function downloadFile(fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

// "ST-1.xlsx"/"ST-2.xlsx" are a generic multi-standard reference sheet
// attached to nearly every client, not written for any specific one — the
// isoStandardFrom() guard already refuses to answer from a file that lists
// several standards together, but skip these outright rather than spend a
// download+parse on a file that can never be about this particular client.
const GENERIC_TEMPLATE_RE = /^ST-\d+\.xlsx$/i;

async function textFromDoc(doc, getOcrWorker) {
  const base = (doc.name || doc.originalName || '').split('/').pop();
  if (GENERIC_TEMPLATE_RE.test(base)) return '';
  const ext = base.split('.').pop().toLowerCase();
  const fileId = doc.publicId?.startsWith('drive:') ? doc.publicId.slice(6) : null;
  if (!fileId) return '';

  try {
    if (ext === 'pdf') {
      const buf = await downloadFile(fileId);
      const parsed = await pdfParse(buf).catch(() => null);
      return parsed?.text || '';
    }
    if (ext === 'docx' || ext === 'docm') {
      const buf = await downloadFile(fileId);
      const result = await mammoth.extractRawText({ buffer: buf }).catch(() => null);
      return result?.value || '';
    }
    if (ext === 'xlsx') {
      const buf = await downloadFile(fileId);
      const wb = XLSX.read(buf, { type: 'buffer' });
      return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n');
    }
    if (['jpg', 'jpeg', 'jfif', 'png', 'webp'].includes(ext)) {
      const buf = await downloadFile(fileId);
      // Lazy: a Tesseract engine only spins up for a lane that actually
      // reaches an image — most clients resolve via the faster formats
      // above and never need one, so most lanes never pay this cost.
      const worker = await getOcrWorker();
      const { data } = await worker.recognize(buf);
      return data.text || '';
    }
  } catch (err) {
    console.error(`    doc read failed (${doc.name}): ${err.message}`);
  }
  return '';
}

// OCR (images) is by far the slowest path — testing showed most clients'
// info is already sitting in a fast-to-read xlsx/docx/pdf (e.g. an "Audit
// Report...xlsx"), so those go first regardless of docType, and images are
// tried last, only if nothing faster answered. docType is just a tiebreaker
// within the same speed tier.
const EXT_SPEED_TIER = { docx: 0, docm: 0, xlsx: 0, pdf: 1, jpg: 2, jpeg: 2, jfif: 2, png: 2, webp: 2 };
const extOf = (doc) => (doc.name || doc.originalName || '').split('.').pop().toLowerCase();
const DOC_TYPE_PRIORITY = { gstCertificate: 0, certificate: 1, agreement: 2, udyamCertificate: 3, invoice: 4, other: 5 };
function sortDocs(docs) {
  return [...docs].sort((a, b) => {
    const tierDiff = (EXT_SPEED_TIER[extOf(a)] ?? 3) - (EXT_SPEED_TIER[extOf(b)] ?? 3);
    if (tierDiff) return tierDiff;
    return (DOC_TYPE_PRIORITY[a.docType] ?? 9) - (DOC_TYPE_PRIORITY[b.docType] ?? 9);
  });
}

async function enrichClient(client, getOcrWorker, report) {
  const need = {
    companyName: NUMERIC_NAME.test(client.companyName || ''),
    isoStandard: !client.isoStandard,
    phone: !client.phone,
  };

  const found = {};
  const sources = {};

  if (need.companyName) {
    for (const doc of client.documents || []) {
      const n = nameFromFilename(doc.name || doc.originalName);
      if (n) { found.companyName = n; sources.companyName = `filename: ${doc.name}`; break; }
    }
  }

  for (const doc of sortDocs(client.documents || [])) {
    if ((!need.companyName || found.companyName) && (!need.isoStandard || found.isoStandard) && (!need.phone || found.phone)) break;
    const text = await textFromDoc(doc, getOcrWorker);
    if (!text) continue;
    const fields = extractFields(text);
    if (need.companyName && !found.companyName && fields.companyName) { found.companyName = fields.companyName; sources.companyName = doc.name; }
    if (need.isoStandard && !found.isoStandard && fields.isoStandard) { found.isoStandard = fields.isoStandard; sources.isoStandard = doc.name; }
    if (need.phone && !found.phone && fields.phone) { found.phone = fields.phone; sources.phone = doc.name; }
  }

  // Marked whether or not anything was found — this is what makes a re-run
  // resume instead of re-downloading/re-OCR'ing every document again for
  // records that were already tried (and may just genuinely have nothing
  // extractable in their documents).
  client.enrichmentAttemptedAt = new Date();
  if (found.companyName) client.companyName = found.companyName;
  if (found.isoStandard) client.isoStandard = found.isoStandard;
  if (found.phone) client.phone = found.phone;
  await client.save();

  if (!Object.keys(found).length) return { touched: false };
  report.push({ clientId: client.clientId, oldClientId: client._id.toString(), ...found, sources });
  return { touched: true, found };
}

async function mapWithConcurrency(items, limit, fn) {
  let next = 0;
  async function lane() {
    let worker = null;
    const getOcrWorker = async () => {
      if (!worker) worker = await createWorker('eng');
      return worker;
    };
    try {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], getOcrWorker, i);
      }
    } finally {
      if (worker) await worker.terminate();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

async function run() {
  await connectDB();
  let clients = await OldClient.find({
    enrichmentAttemptedAt: { $exists: false },
    $or: [
      { isoStandard: { $in: [null, ''] } },
      { phone: { $in: [null, ''] } },
    ],
  });
  clients = clients.filter((c) => NUMERIC_NAME.test(c.companyName || '') || !c.isoStandard || !c.phone);
  if (LIMIT) clients = clients.slice(0, LIMIT);
  console.log(`Found ${clients.length} old clients needing enrichment (not yet attempted).`);

  const report = [];
  let processed = 0, touched = 0;

  await mapWithConcurrency(clients, CONCURRENCY, async (client, getOcrWorker) => {
    try {
      const result = await enrichClient(client, getOcrWorker, report);
      if (result.touched) touched++;
    } catch (err) {
      console.error(`  FAILED ${client.companyName} (${client._id}): ${err.message}`);
    }
    processed++;
    if (processed % 100 === 0 || processed === clients.length) {
      console.log(`progress: ${processed}/${clients.length} processed, ${touched} updated so far`);
    }
  });

  const reportPath = path.join(__dirname, 'old-client-enrichment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== DONE ===');
  console.log(`Processed: ${processed}`);
  console.log(`Updated with at least one new field: ${touched}`);
  console.log(`Report: ${reportPath}`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
