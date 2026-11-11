// End-to-end walkthrough of the mobile app (Vite dev, phone viewport) against the local backend
// on the isolated test database. Creates a fresh account; never touches production.
import { chromium } from '@playwright/test';
const APP = 'http://localhost:5174';
// Run from the repository root with the website on :3000 (test database) and `npx vite` on :5174.
const out = '.data/mw';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
p.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`));
p.on('response', (r) => r.url().includes('/api/') && r.status() >= 500 && errors.push(`HTTP ${r.status()} ${r.url()}`));
let n = 0;
const shot = async (name, full = false) => {
  await p.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full });
  console.log('shot', name);
};
const future = (d) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

try {
  await p.goto(`${APP}/discover`, { waitUntil: 'networkidle' });
  await shot('discover');
  await shot('discover-full', true);

  await p.getByRole('link', { name: 'Plan', exact: true }).click();
  await shot('plan');
  await p.getByRole('button', { name: /^From/ }).click();
  await p.getByLabel('Search airports').fill('mumbai');
  await p.getByRole('button', { name: /BOM/ }).first().waitFor({ timeout: 20000 });
  await shot('airport-picker');
  await p.getByRole('button', { name: /BOM/ }).first().click();
  await p.getByRole('button', { name: /^To/ }).click();
  await p.getByLabel('Search airports').fill('DEL');
  await p.getByRole('button', { name: /DEL/ }).first().waitFor({ timeout: 20000 });
  await p.getByRole('button', { name: /DEL/ }).first().click();
  await p.getByLabel('Departure date').fill(future(12));
  await p.getByLabel('More passengers').click();
  await p.getByLabel('More passengers').click();
  await shot('plan-filled');

  await p.getByRole('button', { name: 'Show aircraft' }).click();
  await p.waitForURL('**/plan/results');
  await p.waitForLoadState('networkidle');
  await shot('results');

  await p.goto(`${APP}/plan/request`);
  await p.waitForLoadState('networkidle');
  await shot('request-signed-out');
  await p.getByRole('link', { name: 'Create an account' }).click();
  await p.waitForURL('**/auth/sign-up**');
  const email = `app.${Date.now()}@example.test`;
  await p.getByLabel('Full name').fill('Asha Mobile');
  await p.getByLabel('E-mail').fill(email);
  await p.getByLabel('Password').fill('correct-horse-battery');
  await p.locator('input[type=checkbox]').check();
  await shot('sign-up');
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL('**/plan/request', { timeout: 30000 });
  await p.waitForLoadState('networkidle');
  await p.getByLabel('Anything we should know?').fill('Two golf bags, vegetarian catering.');
  await shot('request-signed-in');
  await p.getByRole('button', { name: 'Send request' }).click();
  await p.waitForURL('**/journeys/request/**', { timeout: 30000 });
  await p.waitForLoadState('networkidle');
  await shot('request-detail');

  await p.waitForTimeout(1500);
  await shot('request-detail-settled');
  await p.getByRole('button', { name: 'Back' }).click();
  await p.waitForTimeout(800);
  await p.getByRole('link', { name: 'Journeys', exact: true }).click();
  await p.waitForLoadState('networkidle');
  await shot('journeys');

  await p.getByRole('link', { name: 'Explore', exact: true }).click();
  await p.waitForLoadState('networkidle');
  await shot('explore-one-way');
  await p.getByRole('tab', { name: 'Aircraft for sale' }).click();
  await p.waitForLoadState('networkidle');
  await p.locator('[aria-busy="true"]').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
  await shot('explore-aircraft');
  const card = p.locator('a[href^="/explore/aircraft/"]').first();
  if (await card.count()) {
    await card.click();
    await p.waitForLoadState('networkidle');
    await shot('aircraft-detail');
    await p.getByRole('button', { name: 'Back' }).click();
    await p.waitForTimeout(600);
  }

  await p.getByRole('link', { name: 'Profile', exact: true }).click();
  await p.waitForLoadState('networkidle');
  await shot('profile');
  await p.getByRole('link', { name: 'Discover', exact: true }).click();
  await p.waitForLoadState('networkidle');
  await shot('discover-signed-in', true);
  await p.getByRole('link', { name: /Inbox/ }).first().click();
  await p.waitForLoadState('networkidle');
  await shot('inbox');

  // Account deletion from Profile: explicit confirmation, then this device is signed out.
  await p.getByRole('button', { name: 'Back' }).click();
  await p.getByRole('link', { name: 'Profile', exact: true }).click();
  await p.waitForLoadState('networkidle');
  await p.getByRole('button', { name: 'Delete account' }).click();
  await shot('delete-sheet');
  await p.getByLabel('Reason (optional)').fill('Testing the deletion flow');
  await p.getByText('I want my ThePrivate account deleted.').click();
  await p.getByRole('button', { name: 'Request deletion' }).click();
  await p.getByRole('link', { name: 'Sign in' }).first().waitFor({ timeout: 20000 });
  await shot('deleted-signed-out');

  // Forgotten password from the sign-in screen.
  await p.getByRole('link', { name: 'Sign in' }).first().click();
  await p.getByRole('button', { name: 'Forgotten your password?' }).click();
  await p.locator('[role=dialog] input[type=email]').fill(email);
  await p.getByRole('button', { name: 'Send reset link' }).click();
  await p.getByText(/If an account exists/).waitFor({ timeout: 20000 });
  await shot('forgot-sent');
} catch (e) {
  console.log('STOPPED:', e.message.split('\n')[0]);
  await shot('stopped');
}
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await b.close();
