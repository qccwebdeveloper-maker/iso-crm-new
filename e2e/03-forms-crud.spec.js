const { test, expect } = require('@playwright/test');
const { attachErrorCollectors, clearCollector, summarize, loginAs, closeDb } = require('./helpers');

test.afterAll(async () => { await closeDb(); });
test.beforeEach(async ({ page }) => { await loginAs(page, 'admin'); });

const stamp = Date.now();

test('Leads: Add Lead — empty-submit validation, then a valid save succeeds', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await page.goto('/admin/leads', { waitUntil: 'networkidle' });
  clearCollector(collector);

  await page.getByRole('button', { name: 'Add Lead', exact: true }).first().click();
  const modalSubmit = page.locator('.modal-foot').getByRole('button', { name: 'Add Lead', exact: true });
  await modalSubmit.click();

  await expect(page.getByText('Company name is required')).toBeVisible();
  await expect(page.getByText('Contact person is required')).toBeVisible();

  await page.getByPlaceholder('e.g. ABC Enterprises').fill(`QA Test Co ${stamp}`);
  await page.getByPlaceholder('Full name').fill('QA Tester');
  await modalSubmit.click();

  await expect(page.getByText('Lead added successfully!')).toBeVisible({ timeout: 10000 });
  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

test('Auditors: Add Auditor — valid save succeeds (password auto-generated)', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await page.goto('/admin/auditors', { waitUntil: 'networkidle' });
  clearCollector(collector);

  await page.getByRole('button', { name: 'Add Auditor', exact: true }).click();
  await page.getByPlaceholder('Auditor Name').fill(`QA Auditor ${stamp}`);
  await page.getByPlaceholder('auditor@company.com').fill(`qa.auditor.${stamp}@example.com`);
  await page.getByRole('button', { name: /^create$|saving/i }).click();

  await expect(page.getByText(/^Auditor added$/)).toBeVisible({ timeout: 10000 });
  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

test('Standards: Add Standard — empty name blocked, valid save succeeds', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await page.goto('/admin/standards', { waitUntil: 'networkidle' });
  clearCollector(collector);

  await page.getByRole('button', { name: 'Add Standard', exact: true }).click();
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByText('Standard name required')).toBeVisible();

  await page.getByPlaceholder('e.g. ISO 9001:2015').fill(`ISO QA-${stamp}:2026`);
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByText(/^Added$/)).toBeVisible({ timeout: 10000 });
  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

test('Roles: Add Role — empty name blocked, valid save succeeds', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await page.goto('/admin/roles', { waitUntil: 'networkidle' });
  clearCollector(collector);

  await page.getByRole('button', { name: 'Add Role', exact: true }).click();
  await page.getByRole('button', { name: /^save role$/i }).click();
  await expect(page.getByText('Role name required')).toBeVisible();

  await page.getByPlaceholder('e.g. Supervisor').fill(`QA Role ${stamp}`);
  await page.getByRole('button', { name: /^save role$/i }).click();
  await expect(page.getByText(/^Created$/)).toBeVisible({ timeout: 10000 });
  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

test('Users: Add Client — fill required fields, valid save succeeds', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await page.goto('/admin/users', { waitUntil: 'networkidle' });
  clearCollector(collector);

  await page.getByRole('button', { name: 'Add Client', exact: true }).click();
  await page.getByPlaceholder('Company / Client Name').fill(`QA Client ${stamp}`);
  await page.getByPlaceholder('client@company.com').fill(`qa.client.${stamp}@example.com`);
  // Role defaults to 'client', which conditionally reveals an ISO Standard select —
  // scope by the field's own label group rather than DOM order (the Role select
  // renders earlier in the form and shares the same "form-control" class).
  const isoSelect = page.locator('.form-group', { hasText: 'ISO Standard' }).locator('select');
  const opts = await isoSelect.locator('option').allTextContents();
  const real = opts.find(o => o && !/select standard/i.test(o));
  await isoSelect.selectOption({ label: real });

  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByText('User created')).toBeVisible({ timeout: 10000 });
  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});
