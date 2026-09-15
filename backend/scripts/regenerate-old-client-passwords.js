// Every OldClient login created so far (via create-login / create-logins-bulk,
// before this fix) got the password `${clientId}@1234` — guessable by anyone
// who knows or can enumerate the Client ID, which for these legacy folders is
// often just a small sequential number. This regenerates a random password
// for EVERY already-linked legacy client account, replacing the guessable
// one — re-hashing the User doc's password and updating OldClient.loginPassword
// (the plaintext copy the admin table reads) to match.
//
// Only touches OldClient records that already have a linkedUser (i.e. already
// have a login) — does not create new logins (use
// bulk-create-old-client-logins.js for that).
//
// Usage: node backend/scripts/regenerate-old-client-passwords.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const OldClient = require('../models/OldClient');
const User = require('../models/User');

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function generatePassword(length = 10) {
  const bytes = crypto.randomBytes(length);
  let pw = '';
  for (let i = 0; i < length; i++) pw += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  return pw;
}

async function run() {
  await connectDB();
  const clients = await OldClient.find({ linkedUser: { $exists: true, $ne: null } });
  console.log(`Found ${clients.length} old clients with an existing login to regenerate.`);

  const rows = [['Client ID', 'Company Name', 'New Password']];
  let updated = 0, errors = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    try {
      const password = generatePassword();
      const hashed = await bcrypt.hash(password, 10);
      const result = await User.updateOne({ _id: client.linkedUser }, { $set: { password: hashed } });
      if (result.matchedCount === 0) {
        console.error(`  SKIP ${client.companyName} (${client._id}): linked User not found`);
        errors++;
        continue;
      }
      client.loginPassword = password;
      await client.save();
      rows.push([client.clientId || '', client.companyName || '', password]);
      updated++;
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
  console.log(`Passwords regenerated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Full Client ID + password list written to: ${csvPath}`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error('FATAL:', err); process.exit(1); });
