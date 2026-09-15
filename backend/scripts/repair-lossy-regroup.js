// Repairs the bucket the earlier scan-stale-clauses.js --apply run wrote to
// Atlas, because that run SILENTLY DROPPED any row whose clause number didn't
// match a plain catalogue clause number — including real content like Annex A
// control-schedule rows ("A.5.1-A.5.4"), custom text rows ("Stage-1 Readiness
// Review"), and meeting/lunch labels. This script recomputes every bucket from
// the untouched PRE-FIX source (the local Mongo mirror, populated from Atlas
// before the lossy --apply ran) using a non-lossy algorithm: rows that match a
// catalogue clause number are grouped into that catalogue entry (first
// occurrence position); every other row (Annex A refs, custom text, lunch,
// opening/closing in any casing) passes through UNCHANGED at its original
// position. Nothing is ever dropped. Then writes the corrected array to Atlas,
// overwriting the previous (lossy) write for that same bucket.
//
// Usage:
//   node repair-lossy-regroup.js            -> report only
//   node repair-lossy-regroup.js --apply    -> report AND fix on Atlas
require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const connectDB = require('../config/db');
const QMSForm = require('../models/QMSForm');
const Standard = require('../models/Standard');

const APPLY = process.argv.includes('--apply');
const LOCAL_URI = 'mongodb://localhost:27017/test';

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

// Non-lossy regroup: every original row is accounted for, either merged into
// its catalogue group (emitted once, at the group's first-occurrence position)
// or passed through unchanged at its own position.
function regroupNonLossy(rows, clauseKey, catalogue) {
  const numberToGroup = buildNumberToGroupMap(catalogue);
  const groupText = Object.fromEntries(catalogue.map((c) => [c.no, c.text]));
  const membersByGroup = new Map();
  rows.forEach((r) => {
    const raw = String(r[clauseKey] || '').trim();
    const numMatch = raw.match(/^\d+(?:\.\d+){0,4}/);
    const group = numMatch ? numberToGroup.get(numMatch[0]) : null;
    if (!group) return;
    if (!membersByGroup.has(group)) membersByGroup.set(group, []);
    membersByGroup.get(group).push(r);
  });

  const emitted = new Set();
  const out = [];
  rows.forEach((r) => {
    const raw = String(r[clauseKey] || '').trim();
    const numMatch = raw.match(/^\d+(?:\.\d+){0,4}/);
    const group = numMatch ? numberToGroup.get(numMatch[0]) : null;
    if (!group) { out.push(r); return; } // pass through unchanged, in place
    if (emitted.has(group)) return; // already emitted this catalogue group
    emitted.add(group);
    const members = membersByGroup.get(group);
    const row = { dayTime: joinDistinct(members.map((m) => m.dayTime)) };
    if (clauseKey === 'clause') {
      row.clause = group;
      row.description = groupText[group];
      row.conformity = members.find((m) => m.conformity && m.conformity !== 'N/A')?.conformity || members[0].conformity || 'N/A';
      row.finding = joinDistinct(members.map((m) => m.finding));
    } else {
      row.clauses = groupText[group];
      row.activity = joinDistinct(members.map((m) => m.activity));
      row.auditorName = joinDistinct(members.map((m) => m.auditorName));
    }
    out.push(row);
  });
  return out;
}

async function run() {
  // Atlas: the mongoose connection scripts normally use (writes go here).
  await connectDB();
  const standards = await Standard.find().lean();
  const byName = new Map(standards.map((s) => [s.name, s]));

  // Local mirror: untouched pre-fix source of truth for the original rows.
  const localClient = new MongoClient(LOCAL_URI);
  await localClient.connect();
  const localDb = localClient.db();

  let repaired = 0;
  let unchanged = 0;
  const report = [];

  for (const kind of FORM_KINDS) {
    const localForms = await localDb.collection('qmsforms').find({ formType: kind.formType }).toArray();
    for (const lform of localForms) {
      const bucket = lform.formData && lform.formData[kind.scheduleField];
      if (!bucket) continue;
      for (const standardName of Object.keys(bucket)) {
        const std = byName.get(standardName);
        if (!std) continue;
        const catalogue = std.clauses || [];
        const originalRows = bucket[standardName] || [];
        if (!originalRows.length) continue;

        const fixedRows = regroupNonLossy(originalRows, kind.clauseKey, catalogue);

        // Compare against what's currently live on Atlas for this bucket.
        const atlasForm = await QMSForm.findOne({ clientId: lform.clientId, formType: kind.formType });
        if (!atlasForm) { report.push(`SKIP (no Atlas form): client ${lform.clientId} formType ${kind.formType}`); continue; }
        const atlasBucket = atlasForm.formData && atlasForm.formData[kind.scheduleField];
        const atlasRows = (atlasBucket && atlasBucket[standardName]) || [];

        const same = JSON.stringify(atlasRows) === JSON.stringify(fixedRows);
        if (same) { unchanged++; continue; }

        repaired++;
        report.push(`REPAIR client ${lform.clientId} formType ${kind.formType} (${kind.formCode}) "${standardName}": Atlas had ${atlasRows.length} rows -> corrected to ${fixedRows.length} rows (from ${originalRows.length} original)`);

        if (!APPLY) continue;
        atlasForm.formData[kind.scheduleField][standardName] = fixedRows;
        atlasForm.markModified(`formData.${kind.scheduleField}`);
        await atlasForm.save();
      }
    }
  }

  console.log(report.join('\n'));
  console.log(`\n${repaired} buckets need repair, ${unchanged} already correct.${APPLY ? ' All repaired buckets written to Atlas.' : ' (dry run — pass --apply to fix)'}`);
  await localClient.close();
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
