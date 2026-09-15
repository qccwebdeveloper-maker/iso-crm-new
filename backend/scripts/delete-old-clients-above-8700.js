// One-off: delete every OldClient record whose numeric clientId is greater
// than 8700, per explicit admin request. Only the OldClient (archive) record
// is removed — any linked User login account is left untouched on purpose
// (admin's call, not this script's).
//
// Before deleting, the full list of affected records (clientId, company
// name, drive folder id, mongo _id) is written to a JSON backup file so the
// deletion can be audited or manually reversed if needed — deleteMany itself
// is not reversible.
//
// Usage: node backend/scripts/delete-old-clients-above-8700.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OldClient = require('../models/OldClient');

const THRESHOLD = 8700;

async function run() {
  await connectDB();
  const all = await OldClient.find({}, 'clientId companyName driveFolderId linkedUser').lean();
  const toDelete = all.filter((c) => /^\d+$/.test(c.clientId || '') && parseInt(c.clientId, 10) > THRESHOLD);

  console.log(`Found ${toDelete.length} OldClient records with clientId > ${THRESHOLD}.`);
  if (!toDelete.length) { await mongoose.disconnect(); return; }

  const backupPath = path.join(__dirname, `deleted-old-clients-above-${THRESHOLD}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(toDelete, null, 2), 'utf8');
  console.log(`Backup of records to be deleted written to: ${backupPath}`);

  const ids = toDelete.map((c) => c._id);
  const result = await OldClient.deleteMany({ _id: { $in: ids } });

  console.log('\n=== DONE ===');
  console.log(`Deleted: ${result.deletedCount}`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
