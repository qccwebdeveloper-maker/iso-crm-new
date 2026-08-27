const { test, expect } = require('@playwright/test');
const { attachErrorCollectors, clearCollector, summarize, loginAs, CREDS, closeDb } = require('./helpers');

test.afterAll(async () => { await closeDb(); });

// Real usage never lands directly on the giant field-heavy form: QMSFormPage shows a
// client-search screen first, and only renders the (pre-filled, from that client's real
// data) form once a client is resolved. So the meaningful, safe, repeatable exhaustive
// check across all 23 forms is: search the demo client, let it prefill, Save as Draft
// (drafts intentionally skip strict field validation per the model), confirm no crash.
async function draftSaveRoundTrip(page, formPath) {
  const collector = attachErrorCollectors(page);
  clearCollector(collector);
  await page.goto(formPath, { waitUntil: 'networkidle' });

  const searchBox = page.getByPlaceholder('Client ID or Company name');
  await searchBox.waitFor({ state: 'visible', timeout: 10000 });
  await searchBox.fill(CREDS.client.clientId);
  await searchBox.press('Enter');

  // Either the form view renders (exact-match auto-resolve) or a picker list appears.
  // Different QMS form pages label their save-as-draft action differently
  // ("Draft" in the compact stepper header, "Save as Draft" in the bottom action
  // bar) — both share the same underlying handleSave('draft') in QMSFormPage.js.
  // A few pages combine two sub-forms (each with its own draft button) in one view —
  // .first() is enough to exercise a real save action on the page.
  const draftBtn = page.getByRole('button', { name: /draft/i }).first();
  const picker = page.getByText(CREDS.client.clientId).first();
  await Promise.race([
    draftBtn.waitFor({ state: 'visible', timeout: 10000 }),
    picker.waitFor({ state: 'visible', timeout: 10000 }),
  ]).catch(() => {});

  if (!(await draftBtn.isVisible().catch(() => false))) {
    // Landed on a picker instead of auto-resolving — click the matching entry.
    await picker.click();
    await draftBtn.waitFor({ state: 'visible', timeout: 10000 });
  }

  await draftBtn.click();
  // handleSave flips the button to disabled while saving, then a toast fires.
  await expect(page.getByText(/saved as draft|save failed/i).first()).toBeVisible({ timeout: 15000 });
  const failedToast = await page.getByText(/save failed/i).first().isVisible().catch(() => false);

  const issues = summarize(collector);
  if (failedToast) throw new Error(`${formPath}: save-failed toast shown`);
  if (issues) throw new Error(`${formPath}: ${issues}`);
}

for (const mount of ['admin', 'auditor']) {
  test(`QMS forms (${mount}): draft-save round trip for all 23 forms`, async ({ page }) => {
    await loginAs(page, mount);
    const failures = [];
    for (let i = 1; i <= 23; i++) {
      const formPath = `/${mount}/qms/form-${String(i).padStart(2, '0')}`;
      await test.step(formPath, async () => {
        try {
          await draftSaveRoundTrip(page, formPath);
        } catch (e) {
          failures.push(e.message);
        }
      });
    }
    if (failures.length) throw new Error(`${failures.length} form(s) failed:\n` + failures.join('\n'));
  });
}
