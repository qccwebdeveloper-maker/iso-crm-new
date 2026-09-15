// One-off: collapse each of the given standards' granular sub-clauses
// (4.1, 4.2, 4.3, 4.4, ...) into one row per top-level clause number (4, 5,
// 6, ...) in the Standards catalogue itself — matching the grouped style the
// admin built by hand for ISO 22000:2018 (see admin > Standards), just via a
// simple "same leading number -> one row" rule rather than that standard's
// exact editorial grouping (which doesn't reduce to a formula — confirmed by
// comparing the two: e.g. ISO 22000's "5" absorbs only 5.1, while 5.2/5.3
// stay separate, which a pure numbering rule can't reproduce).
//
// Affects the catalogue that AUD-F-03A / AUD-F-05 / AUD-F-09 all read from —
// unlike the earlier groupClausesByTopLevel() used only in Form05/Form07's
// seeding, this rewrites the Standard documents directly, so every form
// (including AUD-F-03A's per-clause Initial/Recert ticking) now sees the
// grouped rows too.
//
// Safe to re-run: always rebuilds a standard's `clauses` array from its
// current content, grouping whatever's there right now.
//
// Usage: node backend/scripts/group-standard-clauses.js "ISO 9001:2015" "ISO 14001:2015" ...
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Standard = require('../models/Standard');

const names = process.argv.slice(2);
if (!names.length) {
  console.error('Usage: node group-standard-clauses.js "<standard name>" [more names...]');
  process.exit(1);
}

function groupByTopLevel(clauses) {
  const order = [];
  const byTop = new Map();
  (clauses || []).forEach((c) => {
    const m = String(c.no || '').match(/^\d+/);
    const top = m ? m[0] : (c.no || '');
    if (!byTop.has(top)) { byTop.set(top, []); order.push(top); }
    byTop.get(top).push(c);
  });
  return order.map((top) => ({
    no: top,
    text: byTop.get(top).map((c) => `${c.no} ${c.text}`.trim()).join('\n'),
  }));
}

async function run() {
  await connectDB();
  for (const name of names) {
    const std = await Standard.findOne({ name });
    if (!std) { console.log(`SKIP (not found): ${name}`); continue; }
    const before = std.clauses.length;
    std.clauses = groupByTopLevel(std.clauses);
    await std.save();
    console.log(`Grouped ${name}: ${before} rows -> ${std.clauses.length} rows`);
  }
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
