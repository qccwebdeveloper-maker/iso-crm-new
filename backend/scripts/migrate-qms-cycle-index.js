// One-off migration: swap QMSForm's unique index to match the current schema's
// {clientId, formType, cycleNumber, phase} so the same Client ID can have more than
// one certification cycle's worth of forms (Initial Audit → Surveillance 1 → 2, then
// a new cycle per recertification-before-expiry), across phases, without violating
// uniqueness. Handles being run against a DB still on either older shape — the
// original {clientId, formType} index, or the intermediate {clientId, formType,
// cycleNumber} one from before the `phase` field existed.
//
// Safe to run more than once. Existing documents are untouched except for a
// cycleNumber:1 / phase:'initial' backfill on anything that doesn't have them yet
// (Mongoose's schema defaults already make them read back that way today — this
// just makes it explicit in the stored document too, so the raw index build has
// real values to work with).
//
// Usage: node backend/scripts/migrate-qms-cycle-index.js
require('dotenv').config();
const mongoose  = require('mongoose');
const connectDB = require('../config/db');
const QMSForm   = require('../models/QMSForm');

async function run() {
  await connectDB(1);
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Could not connect to MongoDB — aborting migration.');
  }

  const collection = QMSForm.collection;

  const collectionExists = await mongoose.connection.db
    .listCollections({ name: collection.collectionName })
    .hasNext();
  if (!collectionExists) {
    console.log('qmsforms collection does not exist yet (no forms saved) — nothing to migrate. ' +
      'Mongoose will create the correct {clientId,formType,cycleNumber,phase} index automatically on first use.');
    return;
  }

  const backfillCycle = await QMSForm.updateMany(
    { cycleNumber: { $exists: false } },
    { $set: { cycleNumber: 1 } }
  );
  console.log(`Backfilled cycleNumber:1 on ${backfillCycle.modifiedCount} existing QMSForm document(s).`);

  const backfillPhase = await QMSForm.updateMany(
    { phase: { $exists: false } },
    { $set: { phase: 'initial' } }
  );
  console.log(`Backfilled phase:'initial' on ${backfillPhase.modifiedCount} existing QMSForm document(s).`);

  const STALE_INDEX_KEYS = [
    { clientId: 1, formType: 1 },
    { clientId: 1, formType: 1, cycleNumber: 1 },
  ];
  const existingIndexes = await collection.indexes();
  for (const staleKey of STALE_INDEX_KEYS) {
    const idx = existingIndexes.find((i) => JSON.stringify(i.key) === JSON.stringify(staleKey));
    if (idx) {
      console.log(`Dropping stale unique index "${idx.name}" (${JSON.stringify(staleKey)})...`);
      await collection.dropIndex(idx.name);
    } else {
      console.log(`Stale index ${JSON.stringify(staleKey)} not found — skipping drop.`);
    }
  }

  const newIndexes = await collection.indexes();
  const hasCurrentIndex = newIndexes.some(
    (idx) => JSON.stringify(idx.key) === JSON.stringify({ clientId: 1, formType: 1, cycleNumber: 1, phase: 1 })
  );
  if (!hasCurrentIndex) {
    console.log('Creating current unique index {clientId:1, formType:1, cycleNumber:1, phase:1}...');
    await collection.createIndex(
      { clientId: 1, formType: 1, cycleNumber: 1, phase: 1 },
      { unique: true }
    );
  } else {
    console.log('Current {clientId:1, formType:1, cycleNumber:1, phase:1} index already exists — skipping create.');
  }

  console.log('Migration complete.');
}

run()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
