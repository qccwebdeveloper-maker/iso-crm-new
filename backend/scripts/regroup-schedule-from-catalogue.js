// Regroups an existing AUD-F-05 (or AUD-F-09, etc.) schedule/checklist's
// per-sub-clause rows into the CURRENT Standards catalogue's own grouping —
// e.g. catalogue entry "5" = "Leadership / 5.1 Leadership and commitment /
// 5.1.1 General / 5.1.2 Customer focus" absorbs old rows "5.1/5.1.1" and
// "5.1.2", while catalogue "5.2" and "5.3" (their own siblings, with their
// own further structure or none) stay separate rows — matching whatever
// editorial grouping is currently saved in Admin > Standards for this
// standard, not a guessed formula. Nothing is discarded: every old row's
// Day/Time, Activity and Auditor Name is folded into whichever new group
// its own clause number now belongs to (deduped when identical, joined with
// newlines when they differ), so a group ends up with everything its
// members had, just combined instead of on separate rows.
//
// Usage: node backend/scripts/regroup-schedule-from-catalogue.js <clientId> <formType> <standardName> [scheduleField]
//   scheduleField defaults to "schedules" (used by Form05/Form09 Plan &
//   Schedule); pass "checklists" for the Report's clause/description shape.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const QMSForm = require('../models/QMSForm');
const Standard = require('../models/Standard');

const [, , clientId, formTypeArg, standardName, scheduleFieldArg] = process.argv;
if (!clientId || !formTypeArg || !standardName) {
  console.error('Usage: node regroup-schedule-from-catalogue.js <clientId> <formType> <standardName> [scheduleField]');
  process.exit(1);
}
const formType = Number(formTypeArg);
const scheduleField = scheduleFieldArg || 'schedules';

function joinDistinct(values) {
  const seen = new Set();
  const out = [];
  values.forEach((v) => {
    const t = (v || '').trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  });
  return out.join('\n');
}

// Map every sub-clause number mentioned anywhere in the catalogue (in a
// group's own "no" field, or embedded in its "text") to that group's "no" —
// e.g. "5.1", "5.1.1" and "5.1.2" all -> "5"; "5.2.1"/"5.2.2" -> "5.2".
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
  const std = await Standard.findOne({ name: standardName }).lean();
  if (!std) { console.error(`Standard not found: ${standardName}`); process.exit(1); }
  const catalogue = std.clauses || [];
  const numberToGroup = buildNumberToGroupMap(catalogue);
  const groupOrder = catalogue.map((c) => c.no);
  const groupText = Object.fromEntries(catalogue.map((c) => [c.no, c.text]));

  const form = await QMSForm.findOne({ clientId, formType });
  if (!form) { console.error(`No formType ${formType} form found for client ${clientId}`); process.exit(1); }

  const bucket = form.formData?.[scheduleField];
  const rows = bucket && bucket[standardName];
  if (!rows || !rows.length) { console.error(`No ${scheduleField} rows for "${standardName}" on this form`); process.exit(1); }

  const clauseKey = scheduleField === 'checklists' ? 'clause' : 'clauses';
  const opening = rows[0] && rows[0][clauseKey] === 'Opening Meeting' ? rows[0] : null;
  const closing = rows[rows.length - 1] && rows[rows.length - 1][clauseKey] === 'Closing Meeting' ? rows[rows.length - 1] : null;
  const clauseRows = rows.slice(opening ? 1 : 0, closing ? rows.length - 1 : rows.length);

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
    console.log(`Warning: ${unmatched.length} row(s) didn't match any catalogue clause number (left out): ${unmatched.slice(0, 5).join(' | ')}`);
  }

  const grouped = groupOrder.filter((no) => byGroup.has(no)).map((no) => {
    const members = byGroup.get(no);
    const row = { dayTime: joinDistinct(members.map((r) => r.dayTime)) };
    if (scheduleField === 'checklists') {
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
  form.formData[scheduleField][standardName] = next;
  form.markModified(`formData.${scheduleField}`);
  await form.save();

  console.log(`Regrouped "${standardName}" on client ${clientId}'s formType ${formType} (${scheduleField}): ${clauseRows.length} rows -> ${grouped.length} catalogue-grouped rows (+ opening/closing kept)`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
