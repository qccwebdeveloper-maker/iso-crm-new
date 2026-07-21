// One-time migration: the auditor-signature roster was originally imported with
// its images written into the tracked backend/assets/auditor-signatures/ folder
// (see importAuditorSignatures.js) so it would survive a deploy without needing
// AWS credentials at import time. Now that the roster is managed live through
// the admin "Auditor Signatures" page (which uploads straight to S3), this
// script moves those already-imported local images into the same S3 bucket and
// repoints each roster record's signatureUrl — so every signature, old and new,
// is served the same way (via /api/files/<key>, S3-signed).
//
// Requires AWS credentials (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or an IAM
// role) and S3_BUCKET/AWS_REGION in the environment — run this wherever those
// are already set (e.g. the production server), not on a machine without them.
//
// Usage: node scripts/migrateAuditorSignaturesToS3.js
const path = require('path');
const fs   = require('fs');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const AuditorSignature = require('../models/AuditorSignature');
const { uploadToS3 } = require('../utils/s3');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'auditor-signatures');
const LOCAL_PREFIX = '/assets/auditor-signatures/';

async function main() {
  await connectDB();
  const rows = await AuditorSignature.find({ signatureUrl: { $regex: `^${LOCAL_PREFIX}` } });
  console.log(`Found ${rows.length} roster entries still pointing at local assets.`);

  let migrated = 0, failed = 0;
  for (const row of rows) {
    const fileName = row.signatureUrl.slice(LOCAL_PREFIX.length);
    const filePath = path.join(ASSETS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ ${row.name}: local file missing (${filePath}) — skipping`);
      failed++;
      continue;
    }
    const ext = path.extname(fileName).toLowerCase();
    const mimetype = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    try {
      const buf = fs.readFileSync(filePath);
      const result = await uploadToS3(buf, 'iso-crm/auditor-signatures', fileName, mimetype);
      row.signatureUrl = result.secure_url;
      await row.save();
      migrated++;
      console.log(`  ✓ ${row.name} -> ${result.secure_url}`);
    } catch (err) {
      console.error(`  ✗ ${row.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Migrated ${migrated}, failed ${failed}.`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
