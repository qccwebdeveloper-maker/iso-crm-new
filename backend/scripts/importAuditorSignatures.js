// One-off importer: reads the "List-03" auditor roster sheet in Signature.xlsx
// (name + location per row, plus an embedded signature image/OLE-object preview
// anchored to that row) and upserts it into the AuditorSignature collection so
// QMS forms (e.g. F-03 Auditor Declaration) can auto-fill a signatory's signature
// by matching their typed name — no manual upload needed.
//
// Usage: node scripts/importAuditorSignatures.js [path/to/Signature.xlsx]
//
// Cell data is read with the `xlsx` package; embedded images live outside what
// that package exposes, so the same .xlsx (really a zip) is opened a second time
// with `adm-zip` to pull rows out of the OOXML drawing parts:
//   - xl/drawings/drawingN.xml   — directly-pasted pictures (xdr:pic + a:blip)
//   - xl/drawings/vmlDrawingN.vml — legacy preview images for embedded OLE
//     objects (old "double-click to open source app" signature pastes)
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { execFileSync } = require('child_process');
const XLSX   = require('xlsx');
const AdmZip = require('adm-zip');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const AuditorSignature = require('../models/AuditorSignature');
const { uploadToS3 } = require('../utils/s3');

// Some signatures were pasted into Excel as an embedded OLE object rather than a
// plain picture, and their preview image is a legacy .wmf/.emf (Windows Metafile)
// — a vector format browsers can't render. On Windows, GDI+ (via .NET
// System.Drawing, reachable through PowerShell) can load and rasterize these
// natively, so shell out to it rather than dropping the signature. Returns a PNG
// Buffer, or null if conversion isn't possible (non-Windows, or a corrupt file).
function convertLegacyMetafileToPng(buf) {
  if (process.platform !== 'win32') return null;
  const tmp = os.tmpdir();
  const inPath  = path.join(tmp, `qcc-sig-${Date.now()}-${Math.random().toString(36).slice(2)}.wmf`);
  const outPath = inPath.replace(/\.wmf$/, '.png');
  try {
    fs.writeFileSync(inPath, buf);
    const script = [
      'Add-Type -AssemblyName System.Drawing;',
      `$img = [System.Drawing.Image]::FromFile('${inPath}');`,
      '$bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height;',
      '$g = [System.Drawing.Graphics]::FromImage($bmp);',
      '$g.Clear([System.Drawing.Color]::White);',
      '$g.DrawImage($img, 0, 0, $img.Width, $img.Height);',
      `$bmp.Save('${outPath}', [System.Drawing.Imaging.ImageFormat]::Png);`,
    ].join(' ');
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'pipe' });
    return fs.existsSync(outPath) ? fs.readFileSync(outPath) : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(inPath, { force: true });
    fs.rmSync(outPath, { force: true });
  }
}

const SHEET_NAME = 'List-03';
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'auditor-signatures');
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const xlsxPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'Signature.xlsx');

function relTarget(relsXml, rId) {
  const re = new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`);
  const m = relsXml.match(re) || relsXml.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rId}"`));
  return m ? m[1] : null;
}

function resolvePartPath(basePartDir, target) {
  // Targets in .rels files are relative to the folder the .rels file's owner lives in
  // (e.g. "../media/image1.png" relative to xl/worksheets/ or xl/drawings/).
  const parts = basePartDir.split('/').concat(target.split('/'));
  const out = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

function main() {
  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    process.exit(1);
  }
  console.log(`Reading ${xlsxPath} ...`);

  // ── 1. Cell data (name + location per row) via the xlsx package ──
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    console.error(`Sheet "${SHEET_NAME}" not found. Sheets present: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const roster = new Map(); // rowIndex -> { name, location }
  rows.forEach((row, i) => {
    const name = String(row[1] || '').trim();
    if (!name || name.toLowerCase() === 'auditors name') return;
    roster.set(i, { name, location: String(row[2] || '').trim() });
  });
  console.log(`Found ${roster.size} named rows in "${SHEET_NAME}".`);

  // ── 2. Raw OOXML parts via adm-zip, to locate the embedded signature images ──
  const zip = new AdmZip(xlsxPath);
  const readText = (partPath) => {
    const entry = zip.getEntry(partPath);
    return entry ? zip.readAsText(entry) : null;
  };
  const readBinary = (partPath) => {
    const entry = zip.getEntry(partPath);
    return entry ? zip.readFile(entry) : null;
  };

  const workbookXml = readText('xl/workbook.xml');
  const workbookRels = readText('xl/_rels/workbook.xml.rels');
  const sheetNameM = workbookXml.match(new RegExp(`<sheet[^>]*name="${SHEET_NAME}"[^>]*r:id="(rId\\d+)"`));
  if (!sheetNameM) throw new Error(`Could not resolve sheet id for "${SHEET_NAME}"`);
  const sheetTarget = relTarget(workbookRels, sheetNameM[1]); // e.g. "worksheets/sheet1.xml"
  const sheetPartPath = `xl/${sheetTarget}`;
  const sheetFile = sheetTarget.split('/').pop().replace('.xml', '');
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.xml.rels`;
  const sheetRels = readText(sheetRelsPath) || '';

  // rowIndex -> { path, rId } from directly-pasted pictures
  const pictureByRow = new Map();
  const drawingRidM = sheetRels.match(/<Relationship[^>]*Id="(rId\d+)"[^>]*Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/)
    || sheetRels.match(/<Relationship[^>]*Type="[^"]*\/drawing"[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/);
  if (drawingRidM) {
    const drawingTarget = resolvePartPath('xl/worksheets', drawingRidM[2]); // xl/drawings/drawingN.xml
    const drawingXml = readText(drawingTarget);
    const drawingRelsPath = drawingTarget.replace(/xl\/drawings\/([^/]+)$/, 'xl/drawings/_rels/$1.rels');
    const drawingRels = readText(drawingRelsPath) || '';
    const anchors = drawingXml.match(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g) || [];
    anchors.forEach(a => {
      const rowM = a.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
      const embedM = a.match(/r:embed="(rId\d+)"/);
      if (!rowM || !embedM) return;
      const target = relTarget(drawingRels, embedM[1]);
      if (!target) return;
      pictureByRow.set(Number(rowM[1]), resolvePartPath('xl/drawings', target));
    });
  }

  // rowIndex -> path from legacy OLE-object preview images (vmlDrawing)
  const oleByRow = new Map();
  const vmlRidM = sheetRels.match(/<Relationship[^>]*Id="(rId\d+)"[^>]*Type="[^"]*\/vmlDrawing"[^>]*Target="([^"]+)"/)
    || sheetRels.match(/<Relationship[^>]*Type="[^"]*\/vmlDrawing"[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/);
  if (vmlRidM) {
    const vmlTarget = resolvePartPath('xl/worksheets', vmlRidM[2]); // xl/drawings/vmlDrawingN.vml
    const vmlXml = readText(vmlTarget);
    const vmlRelsPath = vmlTarget.replace(/xl\/drawings\/([^/]+)$/, 'xl/drawings/_rels/$1.rels');
    const vmlRels = readText(vmlRelsPath) || '';
    const shapes = vmlXml.match(/<v:shape[\s\S]*?<\/v:shape>/g) || [];
    shapes.forEach(s => {
      const relidM = s.match(/o:relid="(rId\d+)"/);
      const anchorM = s.match(/<x:Anchor>([^<]+)<\/x:Anchor>/);
      if (!relidM || !anchorM) return;
      const firstRow = Number(anchorM[1].split(',')[2]);
      const target = relTarget(vmlRels, relidM[1]);
      if (!target) return;
      oleByRow.set(firstRow, resolvePartPath('xl/drawings', target));
    });
  }

  console.log(`Direct pictures: ${pictureByRow.size}, OLE preview images: ${oleByRow.size}`);

  // ── 3. Merge + upload each row's image, then upsert into MongoDB ──
  async function run() {
    await connectDB();
    let imported = 0, withImage = 0, skippedFormat = 0;

    for (const [rowIndex, { name, location }] of roster) {
      const imgPath = pictureByRow.get(rowIndex) || oleByRow.get(rowIndex);
      let signatureUrl = '';

      if (imgPath) {
        let ext = path.extname(imgPath).toLowerCase();
        let buf = readBinary(imgPath);
        if (buf && (ext === '.wmf' || ext === '.emf')) {
          const converted = convertLegacyMetafileToPng(buf);
          if (converted) { buf = converted; ext = '.png'; }
          else {
            buf = null;
            skippedFormat++;
            console.warn(`  ⚠ ${name}: signature is a legacy ${ext} image and couldn't be converted (not on Windows?) — upload it manually via the admin roster page.`);
          }
        }
        if (buf) {
          const mimetype = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          const safeName = `${Date.now()}-${name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '')}${ext}`;
          // Signatures now live in S3 — the same store every other upload in the
          // app (and the admin "Auditor Signatures" page) uses — so this bulk
          // import and a one-by-one admin upload end up served identically. If
          // this script is run somewhere without AWS credentials, fall back to
          // the tracked `assets/` folder so the image still ships with the
          // deployed code rather than being silently dropped.
          try {
            const result = await uploadToS3(buf, 'iso-crm/auditor-signatures', safeName, mimetype);
            signatureUrl = result.secure_url;
          } catch (s3Err) {
            console.warn(`  ⚠ ${name}: S3 upload failed (${s3Err.message}) — saving to tracked assets/ instead`);
            fs.writeFileSync(path.join(ASSETS_DIR, safeName), buf);
            signatureUrl = `/assets/auditor-signatures/${safeName}`;
          }
          withImage++;
        }
      }

      const nameKey = name.trim().toLowerCase();
      await AuditorSignature.findOneAndUpdate(
        { nameKey },
        {
          name,
          location,
          ...(signatureUrl ? { signatureUrl } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported++;
    }

    console.log(`\nDone. Upserted ${imported} auditors (${withImage} with a signature image, ${skippedFormat} need manual upload).`);
    await mongoose.disconnect();
    process.exit(0);
  }

  run().catch(err => { console.error(err); process.exit(1); });
}

main();
