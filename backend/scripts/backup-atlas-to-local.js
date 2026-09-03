// Safety backup: mirror the ENTIRE Atlas "test" database (every collection, every
// document, as-is) into the local mongod running on localhost:27017/test, before
// any index/schema migration touches Atlas.
//
// Read-only against Atlas — this script never writes to the source. The local
// "test" database is wiped collection-by-collection right before each one is
// re-populated, so localhost ends up an exact mirror of Atlas at this moment.
//
// Usage: node backend/scripts/backup-atlas-to-local.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const SOURCE_URI = process.env.MONGODB_URI;
const TARGET_URI = 'mongodb://localhost:27017/test';

const srcClient = new MongoClient(SOURCE_URI || 'mongodb://unset');
const dstClient = new MongoClient(TARGET_URI);

async function run() {
  if (!SOURCE_URI) throw new Error('MONGODB_URI not set in backend/.env');

  await srcClient.connect();
  await dstClient.connect();
  console.log('Connected to Atlas (source) and localhost:27017 (target).');

  const srcDb = srcClient.db('test');
  const dstDb = dstClient.db('test');

  const collections = await srcDb.listCollections().toArray();
  console.log(`Found ${collections.length} collection(s) on Atlas: ${collections.map(c => c.name).join(', ')}`);

  const summary = [];
  for (const { name } of collections) {
    const srcColl = srcDb.collection(name);
    const count = await srcColl.countDocuments();

    await dstDb.collection(name).drop().catch(err => {
      if (err.codeName !== 'NamespaceNotFound') throw err;
    });

    if (count > 0) {
      const docs = await srcColl.find({}).toArray();
      // Insert in batches to avoid a single oversized bulk write.
      const BATCH = 500;
      for (let i = 0; i < docs.length; i += BATCH) {
        await dstDb.collection(name).insertMany(docs.slice(i, i + BATCH), { ordered: false });
      }
    }

    // Mirror indexes too, so the local copy is a faithful snapshot (including
    // whatever the CURRENT (stale) Atlas indexes are).
    const indexes = await srcColl.indexes();
    const toCreate = indexes.filter(idx => idx.name !== '_id_');
    for (const idx of toCreate) {
      const { key, name: idxName, ...options } = idx;
      delete options.v; delete options.ns;
      await dstDb.collection(name).createIndex(key, { name: idxName, ...options }).catch(err => {
        console.warn(`  Could not recreate index "${idxName}" on ${name}: ${err.message}`);
      });
    }

    const dstCount = await dstDb.collection(name).countDocuments();
    summary.push({ collection: name, atlasCount: count, localCount: dstCount });
    console.log(`  ${name}: ${count} doc(s) on Atlas -> ${dstCount} doc(s) now on localhost`);
  }

  console.log('\nBackup summary:');
  console.table(summary);

  const mismatched = summary.filter(s => s.atlasCount !== s.localCount);
  if (mismatched.length) {
    console.error('MISMATCH detected in:', mismatched.map(m => m.collection).join(', '));
    process.exitCode = 1;
  } else {
    console.log('\nAll collections verified: localhost is now a full mirror of Atlas.');
  }
}

run()
  .catch(err => {
    console.error('Backup failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([srcClient.close().catch(() => {}), dstClient.close().catch(() => {})]);
    process.exit();
  });
