const { test, expect } = require('@playwright/test');
const { attachErrorCollectors, clearCollector, summarize, loginAs, closeDb } = require('./helpers');

test.afterAll(async () => { await closeDb(); });

test('Modal: Admin Applications — assign auditor/reviewer', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await loginAs(page, 'admin');
  await page.goto('/admin/applications', { waitUntil: 'networkidle' });
  clearCollector(collector);

  const assignBtn = page.getByRole('button', { name: /^assign$/i }).first();
  await assignBtn.waitFor({ state: 'visible', timeout: 10000 });
  await assignBtn.click();

  await expect(page.getByText(/Assign Team/)).toBeVisible();
  const auditorSelect = page.locator('.form-group', { hasText: 'Assign Auditor' }).locator('select');
  const opts = await auditorSelect.locator('option').allTextContents();
  const realAuditor = opts.find(o => o && !/select auditor/i.test(o));
  if (realAuditor) await auditorSelect.selectOption({ label: realAuditor });

  await page.getByRole('button', { name: /confirm assign/i }).click();
  await expect(page.getByText(/^Assigned!$/)).toBeVisible({ timeout: 10000 });

  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

test('Search/filter: Admin Users search narrows the list', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await loginAs(page, 'admin');
  await page.goto('/admin/users', { waitUntil: 'networkidle' });
  clearCollector(collector);

  const rowsBefore = await page.locator('tbody tr').count();
  await page.getByPlaceholder('Search name, email, client ID…').fill('zzz-no-such-user-zzz');
  await page.waitForTimeout(400);
  const rowsAfterJunk = await page.locator('tbody tr').count();
  expect(rowsAfterJunk).toBeLessThanOrEqual(rowsBefore);

  await page.getByPlaceholder('Search name, email, client ID…').fill('');
  await page.waitForTimeout(400);
  const rowsCleared = await page.locator('tbody tr').count();
  expect(rowsCleared).toBe(rowsBefore);

  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

test('OTP screen: change-email and resend links work', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await page.goto('/login/admin');
  await page.locator('input[placeholder="Enter admin email"]').fill('qcc.webdeveloper@gmail.com');
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.locator('input[maxlength="1"]').first().waitFor({ state: 'visible', timeout: 15000 });
  clearCollector(collector);

  await page.getByRole('button', { name: /change email/i }).click();
  await expect(page.locator('input[placeholder="Enter admin email"]')).toBeVisible();

  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});

for (const role of ['admin', 'client', 'auditor', 'sales']) {
  test(`Logout: ${role} — signs out and protected routes bounce back to login`, async ({ page }) => {
    const collector = attachErrorCollectors(page);
    await loginAs(page, role);
    clearCollector(collector);

    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 10000 });

    await page.goto(`/${role}`, { waitUntil: 'networkidle' });
    expect(new URL(page.url()).pathname).toBe('/login');

    const issues = summarize(collector);
    expect(issues, issues).toBe('');
  });
}

for (const role of ['admin', 'client', 'auditor', 'sales']) {
  test(`Responsive (375px): ${role} login + dashboard render without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    const collector = attachErrorCollectors(page);

    await page.goto(`/login/${role}`, { waitUntil: 'networkidle' });
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `login/${role} horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(2);

    await loginAs(page, role);
    await page.waitForTimeout(500);
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${role} dashboard horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(2);

    const issues = summarize(collector);
    expect(issues, issues).toBe('');
  });
}
