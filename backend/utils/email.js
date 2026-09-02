// ─────────────────────────────────────────────────────────────
//  EMAIL SENDER — Gmail SMTP via nodemailer only
//  Requires GMAIL_USER + GMAIL_PASS (Gmail App Password, 16 chars)
// ─────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');
const dns        = require('dns');

// nodemailer resolves both A and AAAA records for the SMTP host and then picks
// a RANDOM address from the combined list (see formatDNSValue in its shared
// resolver) — it doesn't prefer IPv4. On hosts like Render, whose IPv6 route
// to Gmail is unreachable, that random pick fails ~half the time with
// ENETUNREACH. Resolving the A record ourselves and connecting to that literal
// IP sidesteps nodemailer's picker entirely; passing `servername` keeps TLS
// SNI/cert validation targeting the real hostname.
async function resolveIPv4Host(hostname) {
  try {
    const addresses = await dns.promises.resolve4(hostname);
    if (addresses.length) return addresses[Math.floor(Math.random() * addresses.length)];
  } catch (e) {
    console.warn(`[Email] Could not resolve ${hostname} to an IPv4 address, using hostname directly:`, e.message);
  }
  return null;
}

const withTimeout = async (promise, timeoutMs, label) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

function getGmailCredentials() {
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_PASS || '').replace(/\s/g, '');
  if (!user || pass.length < 16) return null;
  return { user, pass };
}

// A pooled/reused Gmail connection looks free (no per-send handshake) but Gmail
// silently closes idle SMTP sockets server-side; the client doesn't notice until it
// tries to send on the dead socket and hangs until socketTimeout. A short-lived,
// non-pooled connection per send costs a ~1-3s handshake but is never stale.
async function buildGmailTransport() {
  const creds = getGmailCredentials();
  if (!creds) return null;

  const ip = await resolveIPv4Host('smtp.gmail.com');
  return nodemailer.createTransport({
    host: ip || 'smtp.gmail.com',
    servername: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: creds,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// Verifies Gmail credentials at server startup so a bad app password is caught
// in the logs immediately instead of surfacing as a failed OTP send later.
async function warmGmailTransport() {
  const t = await buildGmailTransport();
  if (!t) {
    console.warn('[Email] GMAIL_USER/GMAIL_PASS not configured — OTP emails will fail to send.');
    return;
  }
  try {
    await t.verify();
    console.log('[Email] Gmail SMTP credentials verified');
  } catch (e) {
    console.warn('[Email] Gmail verification failed (will retry lazily on first send):', e.message);
  } finally {
    t.close();
  }
}

async function sendMail({ to, subject, html }) {
  const t = await buildGmailTransport();
  if (!t) throw new Error('Email service is not configured. Set GMAIL_USER and GMAIL_PASS.');

  try {
    await withTimeout(
      t.sendMail({ from: `"QC Certification CRM" <${getGmailCredentials().user}>`, to, subject, html }),
      20000,
      'Gmail email delivery'
    );
    console.log(`✅ Email sent via Gmail → ${to}`);
    return { ok: true, via: 'gmail' };
  } catch (e) {
    console.warn('[Email] Gmail SMTP failed:', e.message);
    throw new Error('Email service is temporarily unavailable. Please try again shortly.');
  } finally {
    t.close();
  }
}

// ─────────────────────────────────────────────────────────────
//  OTP EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────
function otpHtml(name, otp, mins) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>OTP Verification</title>
  <style>
    body { margin:0; padding:0; background:#f0f4f8; font-family:Arial,Helvetica,sans-serif; }
    .wrapper { width:100%; background:#f0f4f8; padding:32px 16px; box-sizing:border-box; }
    .card { background:#ffffff; border:1px solid #dde3ea; border-radius:10px; overflow:hidden; max-width:520px; margin:0 auto; }
    .header { background:#1565c0; padding:28px 36px; }
    .header-title { margin:0; font-size:20px; font-weight:bold; color:#ffffff; }
    .header-sub { margin:5px 0 0; font-size:12px; color:#bbdefb; }
    .body { padding:32px 36px; }
    .greeting { margin:0 0 6px; font-size:16px; color:#111111; }
    .info { margin:0 0 24px; font-size:14px; color:#555555; line-height:1.7; }
    .otp-box { background:#eef4ff; border:2px solid #1565c0; border-radius:8px; padding:28px 16px; text-align:center; margin-bottom:24px; }
    .otp-label { margin:0 0 10px; font-size:11px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:#1565c0; }
    .otp-code { margin:0; font-size:44px; font-weight:bold; letter-spacing:14px; color:#0d47a1; font-family:'Courier New',Courier,monospace; line-height:1.1; }
    .otp-expiry { margin:12px 0 0; font-size:12px; color:#777777; }
    .notice { font-size:13px; color:#666666; line-height:1.6; margin:0; }
    .footer { background:#f8f9fb; border-top:1px solid #dde3ea; padding:16px 36px; }
    .footer p { margin:0; font-size:12px; color:#999999; }

    @media only screen and (max-width:600px) {
      .wrapper { padding:16px 8px !important; }
      .header { padding:20px 20px !important; }
      .header-title { font-size:17px !important; }
      .body { padding:24px 20px !important; }
      .otp-code { font-size:36px !important; letter-spacing:10px !important; }
      .otp-box { padding:22px 12px !important; }
      .footer { padding:14px 20px !important; }
    }

    @media only screen and (max-width:400px) {
      .otp-code { font-size:28px !important; letter-spacing:6px !important; }
      .greeting { font-size:14px !important; }
      .info { font-size:13px !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <p class="header-title">QC Certification</p>
        <p class="header-sub">ISO Certification Management Platform</p>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Hello, <strong>${name}</strong></p>
        <p class="info">
          You requested a one-time password to log in to the Admin Dashboard.<br>
          Use the code below &mdash; it expires in <strong>${mins} minutes</strong>.
        </p>

        <!-- OTP Box -->
        <div class="otp-box">
          <p class="otp-label">Your OTP Code</p>
          <p class="otp-code">${otp}</p>
          <p class="otp-expiry">Valid for ${mins} minutes only</p>
        </div>

        <p class="notice">
          If you did not request this OTP, please ignore this email.<br>
          Do not share this code with anyone for any reason.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} QC Certification &middot; ISO CRM Platform. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
//  WELCOME EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────
function welcomeHtml(name, clientId, email, password) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;background:#eef2f7;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(21,101,192,.15);">
  <tr>
    <td style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:34px 40px;text-align:center;">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:.5px;">QC Certification</div>
      <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:5px;">ISO Certification Management Platform</div>
    </td>
  </tr>
  <tr>
    <td style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0d1b2a;">Welcome, ${name}!</h2>
      <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
        Your account has been <strong style="color:#16a34a;">activated</strong>.
        You can now log in and start your ISO certification journey.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border:2px solid #90caf9;
                        border-radius:14px;padding:26px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                      color:#1565c0;margin-bottom:14px;">Your Login Credentials</div>
          <table width="100%" cellpadding="7">
            <tr>
              <td style="font-size:12px;color:#64748b;font-weight:600;width:110px;">Client ID</td>
              <td style="font-size:13px;font-weight:800;color:#0d1b2a;font-family:'Courier New',monospace;">${clientId}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#64748b;font-weight:600;">Email</td>
              <td style="font-size:13px;font-weight:700;color:#0d1b2a;">${email}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#64748b;font-weight:600;">Password</td>
              <td style="font-size:13px;font-weight:800;color:#0d47a1;font-family:'Courier New',monospace;">${password}</td>
            </tr>
          </table>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
        <tr><td style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;padding:13px 17px;">
          <p style="margin:0;font-size:13px;color:#92400e;">Change your password immediately after first login.</p>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;font-weight:600;color:#64748b;">QC Certification &middot; ISO CRM Platform</p>
      <p style="margin:5px 0 0;font-size:11px;color:#94a3b8;">&copy; ${new Date().getFullYear()} All rights reserved.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────
const sendOtpEmail = ({ to, name, otp, expiresInMinutes = 10 }) =>
  sendMail({
    to,
    subject: `${otp} — Your QC Certification Admin OTP`,
    html:    otpHtml(name, otp, expiresInMinutes),
  });

const sendWelcomeEmail = ({ to, name, clientId, email, password }) =>
  sendMail({
    to,
    subject: 'Welcome to QC Certification CRM — Account Activated',
    html:    welcomeHtml(name, clientId, email, password),
  });

const sendEmail = ({ to, subject, html }) => sendMail({ to, subject, html });

module.exports = { sendOtpEmail, sendWelcomeEmail, sendEmail, warmGmailTransport };
