// ─────────────────────────────────────────────────────────────
//  EMAIL SENDER (nodemailer/SMTP only)
//  Priority order:
//  1. Brevo SMTP      — set BREVO_USER + BREVO_PASS  (any recipient)
//  2. Gmail SMTP      — set GMAIL_USER + GMAIL_PASS   (fallback)
//  3. Ethereal        — preview URL fallback           (dev only, no real delivery)
// ─────────────────────────────────────────────────────────────
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

// Public entry point — hard-caps the whole provider fallback chain (Brevo -> Gmail
// -> Ethereal) at once. Each provider already times out on its own, but those add up
// sequentially (worst case ~50-60s+, more if a provider hangs past its own timeout on
// a blackholed network instead of cleanly erroring), which can outlast the frontend's
// axios timeout and leave the caller with an indefinite hang instead of a clean error.
// This guarantees callers always get a response within OVERALL_TIMEOUT_MS and keeps
// the OTP screen responsive even when a fallback provider is unhealthy.
const OVERALL_TIMEOUT_MS = 24000;

// A pooled/reused Gmail connection looks free (no per-send handshake) but Gmail
// silently closes idle SMTP sockets server-side; the client doesn't notice until it
// tries to send on the dead socket and hangs until socketTimeout. That hang — then a
// close + reconnect + resend — is what was turning into 30-40s OTP delivery times.
// A short-lived, non-pooled connection per send costs a ~1-3s handshake but is never
// stale, which is far cheaper than occasionally eating a full timeout.
async function warmGmailTransport() {
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_PASS || '').replace(/\s/g, '');
  if (!gmailUser || gmailPass.length < 16) return;

  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    // Some hosts (Render included) advertise an IPv6 route to Gmail that
    // isn't actually reachable, failing with ENETUNREACH before IPv4 is ever
    // tried — force IPv4 so this doesn't depend on the host's IPv6 egress.
    family: 4,
    auth: { user: gmailUser, pass: gmailPass },
    connectionTimeout: 10000, greetingTimeout: 8000, socketTimeout: 10000,
  });
  try {
    await t.verify();
    console.log('[Email] Gmail SMTP credentials verified');
  } catch (e) {
    console.warn('[Email] Gmail verification failed (will retry lazily on first send):', e.message);
  } finally {
    t.close();
  }
}

async function sendMail(opts) {
  try {
    return await withTimeout(attemptSendMail(opts), OVERALL_TIMEOUT_MS, 'Email delivery');
  } catch (e) {
    console.warn('[Email] All providers failed or timed out:', e.message);
    throw new Error('Email service is temporarily unavailable. Please try again shortly.');
  }
}

async function attemptSendMail({ to, subject, html }) {
  const nodemailer = require('nodemailer');

  // ── 1. Brevo SMTP (works on Render/EC2, sends to any address) ──
  const brevoUser = (process.env.BREVO_USER || '').trim();
  const brevoPass = (process.env.BREVO_PASS || '').trim();

  if (brevoUser && brevoPass) {
    const t = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: brevoUser, pass: brevoPass },
      connectionTimeout: 10000,
      greetingTimeout:   8000,
      socketTimeout:     15000,
    });
    try {
      await withTimeout(
        t.sendMail({ from: `"QC Certification CRM" <${brevoUser}>`, to, subject, html }),
        12000,
        'Brevo email delivery'
      );
      console.log(`✅ Email sent via Brevo → ${to}`);
      return { ok: true, via: 'brevo' };
    } catch (e) {
      console.warn('[Email] Brevo SMTP failed:', e.message);
    } finally {
      t.close();
    }
  }

  // ── 2. Gmail SMTP fallback ──
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_PASS || '').replace(/\s/g, '');

  if (gmailUser && gmailPass.length >= 16) {
    // Always a fresh, non-pooled connection — see the comment on warmGmailTransport
    // above for why reusing one goes stale and causes exactly the multi-second hang
    // this is meant to avoid. On networks that traffic-shape outbound SMTP (587), a
    // single Gmail connect+STARTTLS+AUTH round trip can genuinely take 12-18s — that's
    // not a transient glitch a retry fixes, so one attempt with a realistic timeout
    // beats two attempts that both starve at an unrealistically short one.
    const t = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      family: 4, // see warmGmailTransport above — avoids ENETUNREACH on hosts with broken IPv6 egress
      auth: { user: gmailUser, pass: gmailPass },
      connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    try {
      await withTimeout(
        t.sendMail({ from: `"QC Certification CRM" <${gmailUser}>`, to, subject, html }),
        20000,
        'Gmail email delivery'
      );
      console.log(`✅ Email sent via Gmail → ${to}`);
      return { ok: true, via: 'gmail' };
    } catch (e) {
      console.warn('[Email] Gmail SMTP failed:', e.message);
    } finally {
      t.close();
    }
  }

  // Ethereal is useful for local previews, but it must never delay a production
  // request after a real provider has failed.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Email service is temporarily unavailable. Please try again shortly.');
  }

  // ── 3. Ethereal preview fallback (development only) ──
  console.log('[Email] Using Ethereal preview — add BREVO_USER + BREVO_PASS for real delivery');
  const acc = await withTimeout(nodemailer.createTestAccount(), 10000, 'Ethereal account creation');
  const t2      = nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587, secure: false,
    auth: { user: acc.user, pass: acc.pass },
    connectionTimeout: 8000, greetingTimeout: 5000, socketTimeout: 10000,
  });
  try {
    const info = await withTimeout(
      t2.sendMail({ from: `"QC Certification CRM" <${acc.user}>`, to, subject, html }),
      15000,
      'Ethereal email delivery'
    );
    const url = nodemailer.getTestMessageUrl(info);
    console.log('\n📬 Ethereal Preview URL:', url, '\n');
    return { ok: true, via: 'ethereal', previewUrl: url };
  } finally {
    t2.close();
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
