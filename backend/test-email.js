/**
 * Test email setup — run:  node test-email.js
 */
require('dotenv').config();
const { sendOtpEmail } = require('./utils/email');

const gmailUser = (process.env.GMAIL_USER || '').trim();
const gmailPass = (process.env.GMAIL_PASS || '').trim();
const TEST_TO   = gmailUser || 'test@example.com';

console.log('\n─── Email Config ───────────────────────────────');
console.log('  GMAIL_USER :', gmailUser || '(not set)');
console.log('  GMAIL_PASS :', gmailPass.length >= 16 ? `✓ set (${gmailPass.length} chars)` : '✗ not configured');
console.log('  Sending to :', TEST_TO);
console.log('────────────────────────────────────────────────\n');

sendOtpEmail({ to: TEST_TO, name: 'Admin', otp: '123456', expiresInMinutes: 10 })
  .then(result => {  
    if (result.via === 'gmail') {
      console.log('✅ SUCCESS — Email delivered to', TEST_TO);
      console.log('   Check your inbox (and spam folder)\n');
    } else {
      console.log('✅ Ethereal preview ready (no Gmail configured)');
      console.log('   Open this URL in your browser to see the email:');
      console.log('  ', result.previewUrl, '\n');
      console.log('   To send to real inbox, add Gmail App Password to .env:');
      console.log('   GMAIL_USER=aryankumar7645@gmail.com');
      console.log('   GMAIL_PASS=xxxx xxxx xxxx xxxx   ← 16-char App Password\n');
    }
  })
  .catch(err => {
    console.error('❌ FAILED —', err.message);
    if (err.message.includes('Invalid login') || err.message.includes('BadCredentials')) {
      console.error('\n   Your GMAIL_PASS is wrong or expired.');
      console.error('   Get a new App Password at:');
      console.error('   https://myaccount.google.com/apppasswords\n');
    }
  });
