const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

let _client = null;
async function getDb() {
  if (!_client) {
    _client = new MongoClient(MONGODB_URI);
    await _client.connect();
  }
  return _client.db();
}
async function closeDb() {
  if (_client) { await _client.close(); _client = null; }
}

const CREDS = {
  admin:    { email: 'qcc.webdeveloper@gmail.com' },
  client:   { clientId: 'CLT-DEMO-001', password: 'client123' },
  auditor:  { email: 'auditor@crm.com', password: 'auditor123' },
  sales:    { email: 'sales@crm.com', password: 'sales123' },
  reviewer: { email: 'reviewer@crm.com', password: 'reviewer123' },
};

// Attaches console/pageerror/response listeners and returns a collector the
// caller reads at any point. Call once per page right after page creation.
function attachErrorCollectors(page) {
  const collector = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      collector.consoleErrors.push({ text: msg.text(), url: page.url() });
    }
  });
  page.on('pageerror', (err) => {
    collector.pageErrors.push({ text: err.message, url: page.url() });
  });
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 400) {
      collector.failedRequests.push({ url, status: res.status(), page: page.url() });
    }
  });
  return collector;
}

function clearCollector(collector) {
  collector.consoleErrors.length = 0;
  collector.pageErrors.length = 0;
  collector.failedRequests.length = 0;
}

function summarize(collector) {
  const parts = [];
  if (collector.consoleErrors.length) parts.push(`${collector.consoleErrors.length} console error(s): ` + collector.consoleErrors.slice(0, 3).map(e => e.text).join(' | '));
  if (collector.pageErrors.length) parts.push(`${collector.pageErrors.length} page error(s): ` + collector.pageErrors.slice(0, 3).map(e => e.text).join(' | '));
  if (collector.failedRequests.length) parts.push(`${collector.failedRequests.length} failed request(s): ` + collector.failedRequests.slice(0, 3).map(e => `${e.status} ${e.url}`).join(' | '));
  return parts.join(' || ');
}

async function fillOtpBoxes(page, digits) {
  const boxes = page.locator('input[maxlength="1"]');
  const count = await boxes.count();
  if (count < 6) throw new Error(`Expected 6 OTP boxes, found ${count}`);
  for (let i = 0; i < 6; i++) {
    await boxes.nth(i).fill(digits[i]);
  }
}

async function getLatestOtp(email) {
  const db = await getDb();
  const rec = await db.collection('otps').findOne(
    { email: email.toLowerCase().trim() },
    { sort: { _id: -1 } }
  );
  if (!rec) throw new Error(`No OTP record found in DB for ${email}`);
  return rec.otp;
}

// Logs in as the given role and waits for landing on that role's dashboard.
async function loginAs(page, role) {
  if (role === 'admin') {
    await page.goto('/login/admin');
    await page.locator('input[placeholder="Enter admin email"]').fill(CREDS.admin.email);
    await page.getByRole('button', { name: /send otp/i }).click();
    // Wait for the UI to actually transition to the OTP-entry screen before reading the
    // DB — the OTP row is written server-side before the HTTP response returns, so by the
    // time the boxes render the row is guaranteed to already exist (querying the DB first,
    // racing the network round trip, is what caused the earlier flaky failure here).
    await page.locator('input[maxlength="1"]').first().waitFor({ state: 'visible', timeout: 15000 });
    const otp = await getLatestOtp(CREDS.admin.email);
    await fillOtpBoxes(page, otp);
    await page.getByRole('button', { name: /open admin dashboard/i }).click();
    await page.waitForURL((u) => u.pathname === '/admin', { timeout: 15000 });
    return;
  }

  if (role === 'client') {
    await page.goto('/login/client');
    await page.locator('input[placeholder="Enter your Client ID"]').fill(CREDS.client.clientId);
    await page.locator('input[placeholder="Enter your password"]').fill(CREDS.client.password);
    await page.getByRole('button', { name: /client login/i }).click();
    await page.waitForURL((u) => u.pathname === '/client', { timeout: 15000 });
    return;
  }

  if (role === 'auditor' || role === 'reviewer') {
    const creds = role === 'reviewer' ? CREDS.reviewer : CREDS.auditor;
    await page.goto('/login/auditor');
    await page.locator('input[placeholder="auditor@crm.com"]').fill(creds.email);
    await page.locator('input[placeholder="Enter your password"]').fill(creds.password);
    await page.getByRole('button', { name: /auditor login/i }).click();
    await page.waitForURL((u) => u.pathname === '/auditor', { timeout: 15000 });
    return;
  }

  if (role === 'sales') {
    await page.goto('/login/sales');
    await page.locator('input[placeholder="sales@crm.com"]').fill(CREDS.sales.email);
    await page.locator('input[placeholder="Enter your password"]').fill(CREDS.sales.password);
    await page.getByRole('button', { name: /sales login/i }).click();
    await page.waitForURL((u) => u.pathname === '/sales', { timeout: 15000 });
    return;
  }

  throw new Error(`Unknown role: ${role}`);
}

// Static route table transcribed from frontend/src/App.js's <Route> list.
const ROUTES = {
  admin: [
    '/admin', '/admin/leads', '/admin/applications', '/admin/payments', '/admin/users',
    '/admin/auditors', '/admin/auditor-signatures', '/admin/reports', '/admin/admin-reports',
    '/admin/feedback', '/admin/standards', '/admin/roles', '/admin/approval-pending', '/admin/dms',
    '/admin/audit-stage1', '/admin/audit-stage2', '/admin/observation', '/admin/certificates',
    '/admin/send-client', '/admin/send-auditor', '/admin/send-reviewer',
    '/admin/application-review', '/admin/application-review/new',
    ...Array.from({ length: 23 }, (_, i) => `/admin/qms/form-${String(i + 1).padStart(2, '0')}`),
    '/admin/qms/download',
  ],
  client: [
    '/client', '/client/applications', '/client/applications/new', '/client/qms/form-01',
    '/client/documents', '/client/certificates', '/client/invoices', '/client/feedback',
    '/client/team-reports',
  ],
  auditor: [
    '/auditor', '/auditor/applications', '/auditor/review-queue', '/auditor/reports',
    '/auditor/documents', '/auditor/settings',
    ...Array.from({ length: 23 }, (_, i) => `/auditor/qms/form-${String(i + 1).padStart(2, '0')}`),
  ],
  sales: [
    '/sales', '/sales/pipeline', '/sales/team', '/sales/leads', '/sales/assign', '/sales/reports',
    '/sales/new-application', '/sales/applications', '/sales/targets', '/sales/settings',
  ],
};

// Dynamic (:id-backed) routes — resolved against real seeded documents at runtime.
async function getDynamicRoutes() {
  const db = await getDb();
  const app = await db.collection('applications').findOne({}, { sort: { _id: -1 } });
  const clientUser = await db.collection('users').findOne({ role: 'client' }, { sort: { _id: -1 } });
  const out = { admin: [], client: [], auditor: [] };
  if (app) {
    out.admin.push(`/admin/applications/${app._id}`);
    out.admin.push(`/admin/applications/${app._id}/edit`);
    out.auditor.push(`/auditor/applications/${app._id}`);
    out.client.push(`/client/applications/${app._id}`);
    out.client.push(`/client/applications/${app._id}/edit`);
  }
  if (clientUser) {
    out.admin.push(`/admin/users/${clientUser._id}`);
  }
  out.client.push('/client/qms/view/1');
  return out;
}

module.exports = {
  CREDS, attachErrorCollectors, clearCollector, summarize, loginAs, fillOtpBoxes,
  getLatestOtp, getDb, closeDb, ROUTES, getDynamicRoutes,
};
