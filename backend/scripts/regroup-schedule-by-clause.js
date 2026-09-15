// One-off: regroup an existing AUD-F-05 Plan & Schedule's per-sub-clause rows
// (4.1, 4.2, 4.3, 4.4, ...) into one row per major clause (4, 5, 6, ...) to
// match the new grouped seeding behaviour in Form05Stage1AuditPlan.js — for a
// form that already has rows, since the seeding effect only fires on an empty
// schedule and never touches already-saved data.
//
// Nothing is discarded: every sub-clause row's Day/Time, Activity and Auditor
// Name is folded into its group's row (joined with newlines when they differ,
// deduped when identical), so a group ends up with everything its sub-clauses
// had, just combined instead of on separate rows.
//
// Usage: node backend/scripts/regroup-schedule-by-clause.js <clientId> <formType> <standardName>
//   e.g. node backend/scripts/regroup-schedule-by-clause.js 8577 5 "ISO 9001:2015"
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const QMSForm = require('../models/QMSForm');

const [, , clientId, formTypeArg, standardName] = process.argv;
if (!clientId || !formTypeArg || !standardName) {
  console.error('Usage: node regroup-schedule-by-clause.js <clientId> <formType> <standardName>');
  process.exit(1);
}
const formType = Number(formTypeArg);

// Join a field's values across a group's rows: keep one copy of each distinct
// value, in the order first seen, so identical repeats (e.g. the same
// auditor name on every row) collapse to one line but genuinely different
// content (different activity notes per sub-clause) is preserved in full.
function joinDistinct(values) {
  const seen = new Set();
  const out = [];
  values.forEach((v) => {
    const t = (v || '').trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  });
  return out.join('\n');
}

async function run() {
  await connectDB();
  const form = await QMSForm.findOne({ clientId, formType });
  if (!form) { console.error(`No formType ${formType} form found for client ${clientId}`); process.exit(1); }

  const schedules = form.formData?.schedules || {};
  const rows = schedules[standardName];
  if (!rows || !rows.length) { console.error(`No schedule rows for "${standardName}" on this form`); process.exit(1); }

  const opening = rows[0]?.clauses === 'Opening Meeting' ? rows[0] : null;
  const closing = rows[rows.length - 1]?.clauses === 'Closing Meeting' ? rows[rows.length - 1] : null;
  const clauseRows = rows.slice(opening ? 1 : 0, closing ? rows.length - 1 : rows.length);

  const order = [];
  const byTop = new Map();
  clauseRows.forEach((r) => {
    const m = String(r.clauses || '').match(/^(\d+)/);
    const top = m ? m[1] : (r.clauses || '');
    if (!byTop.has(top)) { byTop.set(top, []); order.push(top); }
    byTop.get(top).push(r);
  });

  const grouped = order.map((top) => {
    const group = byTop.get(top);
    return {
      dayTime: joinDistinct(group.map((r) => r.dayTime)),
      clauses: group.map((r) => (r.clauses || '').trim()).join('\n'),
      auditorName: joinDistinct(group.map((r) => r.auditorName)),
      activity: joinDistinct(group.map((r) => r.activity)),
    };
  });

  const next = [...(opening ? [opening] : []), ...grouped, ...(closing ? [closing] : [])];
  form.formData.schedules[standardName] = next;
  form.markModified('formData.schedules');
  await form.save();

  console.log(`Regrouped "${standardName}" on client ${clientId}'s formType ${formType}: ${clauseRows.length} sub-clause rows -> ${grouped.length} major-clause rows (+ opening/closing kept)`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
