const { test, expect } = require('@playwright/test');
const { attachErrorCollectors, clearCollector, summarize, loginAs, ROUTES, getDynamicRoutes, closeDb } = require('./helpers');

test.afterAll(async () => { await closeDb(); });

async function crawlRole(page, role) {
  const collector = attachErrorCollectors(page);
  await loginAs(page, role);

  const dynamic = await getDynamicRoutes();
  const routes = [...ROUTES[role], ...(dynamic[role] || [])];

  const failures = [];
  for (const route of routes) {
    await test.step(route, async () => {
      clearCollector(collector);
      const resp = await page.goto(route, { waitUntil: 'networkidle' }).catch((e) => { throw new Error(`navigation failed: ${e.message}`); });
      await page.waitForTimeout(300); // let any post-load toasts/effects settle

      const url = page.url();
      if (/\/login(\/|$)/.test(new URL(url).pathname) && !/\/login/.test(route)) {
        failures.push(`${route} -> bounced to login (${url})`);
        return;
      }
      const bodyText = await page.locator('body').innerText().catch(() => '');
      if (/cannot get \/|unexpected token|is not defined|is not a function/i.test(bodyText)) {
        failures.push(`${route} -> broken page content: ${bodyText.slice(0, 150)}`);
      }
      const issues = summarize(collector);
      if (issues) failures.push(`${route} -> ${issues}`);
    });
  }

  if (failures.length) {
    throw new Error(`${role}: ${failures.length} route issue(s):\n` + failures.join('\n'));
  }
}

test('crawl: admin routes load clean', async ({ page }) => { await crawlRole(page, 'admin'); });
test('crawl: client routes load clean', async ({ page }) => { await crawlRole(page, 'client'); });
test('crawl: auditor routes load clean', async ({ page }) => { await crawlRole(page, 'auditor'); });
test('crawl: sales routes load clean', async ({ page }) => { await crawlRole(page, 'sales'); });
test('crawl: reviewer lands on auditor dashboard', async ({ page }) => {
  const collector = attachErrorCollectors(page);
  await loginAs(page, 'reviewer');
  expect(page.url()).toMatch(/\/auditor$/);
  const issues = summarize(collector);
  expect(issues, issues).toBe('');
});
