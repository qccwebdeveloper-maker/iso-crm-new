// Creates a client login (User account) for every OldClient record that
// doesn't have one yet — same logic as POST /api/oldclients/create-logins-bulk
// (reused directly from backend/routes/oldClients.js, not duplicated), just
// run here instead of over HTTP so it isn't at risk of a request timeout for
// the ~8,500+ records now in the table after the Drive import.
//
// Client ID = the legacy folder-derived ID already on the record (or a fresh
// one). Password = `${clientId}@1234` (bcrypt-hashed in the User doc, same as
// the single/bulk API routes) — deterministic, so it's not printed as a
// secret here so much as reconstructed: this script prints every clientId +
// its password to the console AND to a CSV file for the admin to review,
// since the admin UI only shows one client's credentials at a time (opening
// its edit modal) and reviewing 8,500 of those one by one isn't practical.
//
// Safe to re-run: only OldClient records with no linkedUser yet are touched.
//
// Usage: node backend/scripts/bulk-create-old-client-logins.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OldClient = require('../models/OldClient');
const { createLoginForOldClient } = require('../routes/oldClients');

async function run() {
  await connectDB();
  const clients = await OldClient.find({ linkedUser: { $exists: false } });
  console.log(`Found ${clients.length} old clients without a login.`);

  const rows = [['Client ID', 'Company Name', 'Password']];
  let created = 0, errors = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    try {
      const { user, created: wasCreated } = await createLoginForOldClient(client);
      if (wasCreated) created++;
      rows.push([user.clientId, client.companyName || '', `${user.clientId}@1234`]);
    } catch (err) {
      console.error(`  FAILED ${client.companyName} (${client._id}): ${err.message}`);
      errors++;
    }
    if ((i + 1) % 500 === 0 || i === clients.length - 1) {
      console.log(`progress: ${i + 1}/${clients.length} processed`);
    }
  }

  const csvPath = path.join(__dirname, 'old-client-logins.csv');
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(csvPath, csv, 'utf8');

  console.log('\n=== DONE ===');
  console.log(`Logins created: ${created}`);
  console.log(`Errors: ${errors}`);
  console.log(`Full Client ID + password list written to: ${csvPath}`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
