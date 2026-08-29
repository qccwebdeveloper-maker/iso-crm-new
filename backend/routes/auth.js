const express     = require('express');
const router      = express.Router();
const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcryptjs');
const User        = require('../models/User');
const Otp         = require('../models/Otp');
const AppSetting  = require('../models/AppSetting');
const { protect } = require('../middleware/auth');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/email');
const { generateClientId, findReusableClientId } = require('../utils/clientId');

const SECRET   = process.env.JWT_SECRET || 'crm_secret_key_2024';
const genToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '7d' });
const hashPw   = (pw)  => bcrypt.hash(pw, 10);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email / Client ID and password are required' });

    const identifier = email.trim();
    const isEmail    = identifier.includes('@');
    const user       = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() }
              : { clientId: identifier }
    );
    if (!user) return res.status(401).json({
      message: isEmail ? 'Invalid email or password' : 'Invalid Client ID or password',
    });

    if (!user.isActive) {
      if (user.pendingApproval) return res.status(401).json({ message: 'Your account is pending admin approval.' });
      return res.status(401).json({ message: 'Account deactivated. Contact admin.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    // Admin accounts must always go through OTP verification (/send-otp + /verify-otp).
    // Password alone is never enough here, even if it's correct — this stops admin
    // creds entered into the client/auditor/sales login forms from granting a token.
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts must sign in with OTP. Use the Admin login option.' });
    }

    res.json({ ...user.toJSON(), token: genToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/client-login — the "Client Login" form on the login page.
// Looks up by clientId + role:'client' only — no email fallback — so an
// auditor/sales/admin account can never authenticate through this box.
router.post('/client-login', async (req, res) => {
  try {
    const { clientId, password } = req.body;
    if (!clientId || !password) return res.status(400).json({ message: 'Client ID and password are required' });

    const user = await User.findOne({ clientId: clientId.trim(), role: 'client' });
    if (!user) return res.status(401).json({ message: 'Invalid Client ID or password' });

    if (!user.isActive) {
      if (user.pendingApproval) return res.status(401).json({ message: 'Your account is pending admin approval.' });
      return res.status(401).json({ message: 'Account deactivated. Contact admin.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid Client ID or password' });

    res.json({ ...user.toJSON(), token: genToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/client-send-otp  — step 1: verify clientId+password, send OTP (or direct login if OTP disabled)
router.post('/client-send-otp', async (req, res) => {
  try {
    const { clientId, password } = req.body;
    if (!clientId || !password) return res.status(400).json({ message: 'Client ID and password are required' });

    const user = await User.findOne({ clientId: clientId.trim() });
    if (!user) return res.status(401).json({ message: 'Invalid Client ID or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive. Contact admin.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid Client ID or password' });

    // Check if OTP is globally disabled
    const otpSetting = await AppSetting.findOne({ key: 'clientOtpEnabled' });
    const otpEnabled = otpSetting ? otpSetting.value : true;

    if (!otpEnabled) {
      // OTP disabled — return token directly (direct login)
      return res.json({ ...user.toJSON(), token: genToken(user._id), otpDisabled: true });
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.findOneAndReplace(
      { email: user.email },
      { email: user.email, otp, userId: user._id, expiresAt },
      { upsert: true }
    );

    // Fire-and-forget, same as the admin /send-otp flow: the OTP is already saved,
    // so the client can move to the "enter code" screen immediately instead of
    // waiting out the full email-provider round trip (can be 15-25s on networks
    // that throttle outbound SMTP).
    sendOtpEmail({ to: user.email, name: user.name, otp, expiresInMinutes: 10 })
      .then((result) => console.log(`[OTP] Client OTP sent to ${user.email} via ${result.via}`))
      .catch((err) => console.error(`[OTP] Client OTP delivery to ${user.email} failed: ${err.message}`));

    // Mask email: ar***@gmail.com
    const masked = user.email.replace(/^(.{2})(.+)(@.+)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c);

    res.json({
      message:    'OTP is being sent to your registered email.',
      maskedEmail: masked,
      emailQueued: true,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/client-verify-otp  — step 2: verify OTP, return token
router.post('/client-verify-otp', async (req, res) => {
  try {
    const { clientId, otp } = req.body;
    if (!clientId || !otp) return res.status(400).json({ message: 'Client ID and OTP are required' });

    const user = await User.findOne({ clientId: clientId.trim() });
    if (!user) return res.status(401).json({ message: 'Invalid Client ID' });

    const record = await Otp.findOne({ email: user.email, expiresAt: { $gt: new Date() } });
    if (!record) return res.status(400).json({ message: 'No OTP requested. Please go back and send OTP again.' });
    if (record.otp !== otp.toString().trim()) return res.status(400).json({ message: 'Invalid OTP. Try again.' });

    await Otp.deleteOne({ _id: record._id });

    const fullUser = await User.findById(record.userId).select('-password');
    if (!fullUser || !fullUser.isActive) return res.status(403).json({ message: 'Account is inactive.' });

    res.json({ ...fullUser.toJSON(), token: genToken(fullUser._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/auth/email-status  — diagnostic
router.get('/email-status', async (req, res) => {
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const resendFrom = (process.env.RESEND_FROM || '').trim();
  const brevoUser = (process.env.BREVO_USER || '').trim();
  const brevoPass = (process.env.BREVO_PASS || '').trim();
  const gmailUser = (process.env.GMAIL_USER || '').trim();

  if (resendKey) {
    return res.json({ ok: true, mode: 'resend', note: `Resend HTTP delivery is set${resendFrom ? '' : ' with its default sender'}.` });
  }
  if (brevoUser && brevoPass) {
    return res.json({ ok: true, mode: 'brevo', note: 'Brevo SMTP is set. Emails deliver to any address.' });
  }
  if (gmailUser) {
    return res.json({ ok: true, mode: 'gmail-smtp', note: 'Gmail SMTP is set. Emails deliver to any address.' });
  }
  res.json({ ok: false, mode: 'ethereal-fallback', error: 'No email provider configured. Add BREVO_USER + BREVO_PASS (preferred) or GMAIL_USER + GMAIL_PASS.' });
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Admin email required' });

    const admin = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' })
      .select('_id name email isActive')
      .lean();
    if (!admin) return res.status(404).json({ message: 'No admin account found with this email' });
    if (!admin.isActive) return res.status(403).json({ message: 'Admin account is inactive' });

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.updateOne(
      { email: admin.email },
      { $set: { email: admin.email, otp, userId: admin._id, expiresAt } },
      { upsert: true }
    );

    // The user can enter the OTP while delivery completes. Waiting for the email
    // provider here adds its full network latency (typically 6-7 seconds) before
    // the OTP input appears, even though the OTP is already safely stored.
    sendOtpEmail({ to: admin.email, name: admin.name, otp, expiresInMinutes: 10 })
      .then((result) => {
        console.log(`[OTP] Sent to ${admin.email} via ${result.via}`);
        if (result.previewUrl) console.log(`[OTP] Preview: ${result.previewUrl}`);
      })
      .catch((err) => console.error(`[OTP] Delivery to ${admin.email} failed: ${err.message}`));

    res.json({
      message:    `OTP is being sent to ${admin.email}. Check your inbox.`,
      adminName:  admin.name,
      emailQueued: true,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const key    = email.toLowerCase().trim();
    const record = await Otp.findOne({ email: key, expiresAt: { $gt: new Date() } });

    if (!record) return res.status(400).json({ message: 'No OTP sent to this email. Request a new one.' });
    if (record.otp !== otp.toString().trim()) return res.status(400).json({ message: 'Invalid OTP.' });

    await Otp.deleteOne({ _id: record._id });

    const user = await User.findById(record.userId).select('-password');
    if (!user || !user.isActive) return res.status(403).json({ message: 'Admin account is inactive' });

    res.json({ ...user.toJSON(), token: genToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/register-client
router.post('/register-client', async (req, res) => {
  try {
    const { companyName, email, password, mobile, address, standard, scope, branchLabel } = req.body;
    if (!companyName || !email || !password || !mobile || !address || !standard || !scope)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    // Same company + same standard + a still-active (non-expired) certification is
    // one lifecycle and must keep the same Client ID — a public visitor can't judge
    // whether a second registration is a legitimate second site, so this is a hard
    // stop here (unlike the admin-facing create-user flow, which can confirm past it).
    const reusable = await findReusableClientId({ company: companyName, standard, branchLabel });
    if (reusable) {
      return res.status(409).json({
        message: `An active Client ID (${reusable.clientId}) already exists for ${companyName} under ${standard}. Please log in with that Client ID instead of registering again, or contact your certification body if you believe this is a separate site.`,
        existingClientId: reusable.clientId,
      });
    }

    const clientId = await generateClientId();
    const hashed   = await hashPw(password);

    const user = await User.create({
      name: companyName, email: email.toLowerCase(), password: hashed, role: 'client',
      phone: mobile, company: companyName, address, isoStandard: standard, scope,
      branchLabel: String(branchLabel || '').trim(),
      clientId, isActive: false, pendingApproval: true,
    });

    sendWelcomeEmail({ to: email, name: companyName, clientId, email, password })
      .catch(e => console.warn('[Welcome email failed]', e.message));

    res.status(201).json({ message: 'Registration successful. Pending admin approval.', clientId: user.clientId, email: user.email, name: user.name });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/seed — only ever seeds an empty database; cannot touch existing data
router.post('/seed', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0)
      return res.json({ message: `${count} users exist. Seeding is only allowed on an empty database.` });
    const { execSync } = require('child_process');
    const path = require('path');
    execSync(`node "${path.join(__dirname, '../seed.js')}"`, { stdio: 'inherit' });
    res.json({ message: 'Database seeded successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
