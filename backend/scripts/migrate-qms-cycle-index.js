// One-off migration: swap QMSForm's unique index from {clientId, formType} to
// {clientId, formType, cycleNumber} so the same Client ID can have more than one
// certification cycle's worth of forms (Initial Audit → Surveillance 1 → 2, then a
// new cycle per recertification-before-expiry) without violating uniqueness.
//
// Safe to run more than once. Existing documents are untouched except for a
// cycleNumber:1 backfill on anything that doesn't have it yet (Mongoose's schema
// default already makes them read back as cycleNumber:1 today — this just makes it
// explicit in the stored document too, so the raw index build has real values to
// work with).
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
      'Mongoose will create the correct {clientId,formType,cycleNumber} index automatically on first use.');
    return;
  }

  const backfill = await QMSForm.updateMany(
    { cycleNumber: { $exists: false } },
    { $set: { cycleNumber: 1 } }
  );
  console.log(`Backfilled cycleNumber:1 on ${backfill.modifiedCount} existing QMSForm document(s).`);

  const existingIndexes = await collection.indexes();
  const oldIndex = existingIndexes.find(
    (idx) => JSON.stringify(idx.key) === JSON.stringify({ clientId: 1, formType: 1 })
  );
  if (oldIndex) {
    console.log(`Dropping old unique index "${oldIndex.name}" ({clientId:1, formType:1})...`);
    await collection.dropIndex(oldIndex.name);
  } else {
    console.log('Old {clientId:1, formType:1} index not found (already migrated?) — skipping drop.');
  }

  const newIndexes = await collection.indexes();
  const hasNewIndex = newIndexes.some(
    (idx) => JSON.stringify(idx.key) === JSON.stringify({ clientId: 1, formType: 1, cycleNumber: 1 })
  );
  if (!hasNewIndex) {
    console.log('Creating new unique index {clientId:1, formType:1, cycleNumber:1}...');
    await collection.createIndex(
      { clientId: 1, formType: 1, cycleNumber: 1 },
      { unique: true }
    );
  } else {
    console.log('New {clientId:1, formType:1, cycleNumber:1} index already exists — skipping create.');
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
