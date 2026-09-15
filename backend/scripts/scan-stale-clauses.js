// Scan (and optionally fix) every QMSForm schedule/checklist whose per-standard
// clause rows don't match the CURRENT Standards catalogue's own clause grouping
// (`no` values) for that standard — i.e. rows seeded before the catalogue was
// later consolidated (e.g. "4.1"/"4.2"/"4.3"/"4.4" as 4 separate rows instead of
// today's single catalogue entry "4"). Reuses the exact same regroup logic as
// regroup-schedule-from-catalogue.js, just applied across every affected
// client+standard+form instead of one at a time.
//
// Usage:
//   node backend/scripts/scan-stale-clauses.js            -> report only, no writes
//   node backend/scripts/scan-stale-clauses.js --apply    -> report AND fix every mismatch found
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const QMSForm = require('../models/QMSForm');
const Standard = require('../models/Standard');

const APPLY = process.argv.includes('--apply');

const FORM_KINDS = [
  { formType: 5,  formCode: 'AUD-F-05',        scheduleField: 'schedules',  clauseKey: 'clauses' },
  { formType: 7,  formCode: 'AUD-F-09',        scheduleField: 'checklists', clauseKey: 'clause'  },
  { formType: 9,  formCode: 'AUD-F-11',        scheduleField: 'schedules',  clauseKey: 'clauses' },
  { formType: 11, formCode: 'AUD-F-15',        scheduleField: 'checklists', clauseKey: 'clause'  },
  { formType: 17, formCode: 'AUD-F-05/06 (S)', scheduleField: 'schedules',  clauseKey: 'clauses' },
  { formType: 19, formCode: 'AUD-F-15 (S)',    scheduleField: 'checklists', clauseKey: 'clause'  },
];

function joinDistinct(values) {
  const seen = new Set();
  const out = [];
  values.forEach((v) => {
    const t = (v || '').trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  });
  return out.join('\n');
}

function buildNumberToGroupMap(catalogueClauses) {
  const map = new Map();
  catalogueClauses.forEach((c) => {
    map.set(c.no, c.no);
    const nums = String(c.text || '').match(/\d+(?:\.\d+){0,4}/g) || [];
    nums.forEach((n) => { if (!map.has(n)) map.set(n, c.no); });
  });
  return map;
}

async function run() {
  await connectDB();
  const standards = await Standard.find().lean();
  const byName = new Map(standards.map((s) => [s.name, s]));

  let scannedForms = 0;
  let scannedBuckets = 0;
  let mismatches = 0;
  let fixed = 0;
  const report = [];

  for (const kind of FORM_KINDS) {
    const forms = await QMSForm.find({ formType: kind.formType });
    for (const form of forms) {
      scannedForms++;
      const bucket = form.formData && form.formData[kind.scheduleField];
      if (!bucket) continue;
      for (const standardName of Object.keys(bucket)) {
        scannedBuckets++;
        const std = byName.get(standardName);
        if (!std) { report.push(`  SKIP (standard not found in catalogue): client ${form.clientId} ${kind.formCode} "${standardName}"`); continue; }
        const catalogue = std.clauses || [];
        const groupOrder = catalogue.map((c) => c.no);
        const catalogueNos = new Set(groupOrder);

        const rows = bucket[standardName] || [];
        const clauseKey = kind.clauseKey;
        const opening = rows[0] && rows[0][clauseKey] === 'Opening Meeting' ? rows[0] : null;
        const closing = rows[rows.length - 1] && rows[rows.length - 1][clauseKey] === 'Closing Meeting' ? rows[rows.length - 1] : null;
        const clauseRows = rows.slice(opening ? 1 : 0, closing ? rows.length - 1 : rows.length);

        const rowNos = clauseRows
          .map((r) => String(r[clauseKey] || '').trim().match(/^\d+(?:\.\d+){0,4}/)?.[0])
          .filter(Boolean);
        const rowNoSet = new Set(rowNos);
        const setsMatch = rowNoSet.size === catalogueNos.size && [...rowNoSet].every((n) => catalogueNos.has(n));

        if (setsMatch) continue; // already matches the current catalogue's own grouping

        mismatches++;
        report.push(`MISMATCH client ${form.clientId} formType ${kind.formType} (${kind.formCode}) "${standardName}": ${clauseRows.length} rows vs catalogue's ${groupOrder.length} entries`);

        if (!APPLY) continue;

        const numberToGroup = buildNumberToGroupMap(catalogue);
        const groupText = Object.fromEntries(catalogue.map((c) => [c.no, c.text]));
        const byGroup = new Map();
        const unmatched = [];
        clauseRows.forEach((r) => {
          const raw = String(r[clauseKey] || '').trim();
          const numMatch = raw.match(/^\d+(?:\.\d+){0,4}/);
          const group = numMatch ? numberToGroup.get(numMatch[0]) : null;
          if (!group) { unmatched.push(raw); return; }
          if (!byGroup.has(group)) byGroup.set(group, []);
          byGroup.get(group).push(r);
        });
        if (unmatched.length) {
          report.push(`    warning: ${unmatched.length} row(s) unmatched, left out: ${unmatched.slice(0, 5).join(' | ')}`);
        }

        const grouped = groupOrder.filter((no) => byGroup.has(no)).map((no) => {
          const members = byGroup.get(no);
          const row = { dayTime: joinDistinct(members.map((r) => r.dayTime)) };
          if (clauseKey === 'clause') {
            row.clause = no;
            row.description = groupText[no];
            row.conformity = members.find((r) => r.conformity && r.conformity !== 'N/A')?.conformity || members[0].conformity || 'N/A';
            row.finding = joinDistinct(members.map((r) => r.finding));
          } else {
            row.clauses = groupText[no];
            row.activity = joinDistinct(members.map((r) => r.activity));
            row.auditorName = joinDistinct(members.map((r) => r.auditorName));
          }
          return row;
        });

        const next = [...(opening ? [opening] : []), ...grouped, ...(closing ? [closing] : [])];
        form.formData[kind.scheduleField][standardName] = next;
        form.markModified(`formData.${kind.scheduleField}`);
        await form.save();
        fixed++;
        report.push(`    -> regrouped to ${grouped.length} rows (saved)`);
      }
    }
  }

  console.log(report.join('\n'));
  console.log(`\nScanned ${scannedForms} forms, ${scannedBuckets} standard-buckets. Found ${mismatches} mismatches.${APPLY ? ` Fixed ${fixed}.` : ' (dry run — pass --apply to fix)'}`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
