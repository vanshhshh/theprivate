// Store artwork and screenshots, rendered from the real app (Vite dev server + local backend on the
// isolated test database). Output: mobile/store/ (committed; contains no personal data).
//   node scripts/store-assets.mjs
// Screens with third-party company names (search results) are deliberately excluded: test data
// contains real regulator-listed operators who are not ThePrivate partners.
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobile = path.resolve(here, '..');
const out = path.join(mobile, 'store');
const rootRequire = createRequire(path.resolve(mobile, '../package.json'));
const pw = await import(pathToFileURL(rootRequire.resolve('@playwright/test')).href);
const chromium = pw.chromium ?? pw.default.chromium;
const APP = 'http://localhost:5174';

const browser = await chromium.launch();

// ---- Feature graphic (Google Play, 1024×500) -------------------------------------------------
{
  mkdirSync(path.join(out, 'play'), { recursive: true });
  const font = (rel) => `data:font/woff2;base64,${readFileSync(path.join(mobile, 'node_modules', rel)).toString('base64')}`;
  const plate = `data:image/webp;base64,${readFileSync(path.join(mobile, 'public/media/scenes/jet-inflight-1600.webp')).toString('base64')}`;
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: N; src: url(${font('@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2')}); font-weight: 200 800; }
    @font-face { font-family: N; src: url(${font('@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2')}); font-weight: 200 800; font-style: italic; }
    @font-face { font-family: S; src: url(${font('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2')}); font-weight: 400 700; }
    *{margin:0;box-sizing:border-box} body{width:1024px;height:500px;overflow:hidden;background:#0e1418;color:#f3f0e8;font-family:S}
    .img{position:absolute;inset:0;background:url(${plate}) 62% 50%/cover}
    .scrim{position:absolute;inset:0;background:linear-gradient(90deg,#0e1418 0%,rgba(14,20,24,.85) 38%,rgba(14,20,24,.15) 75%)}
    .t{position:absolute;left:64px;top:50%;transform:translateY(-50%)}
    .mark{font-family:N;font-size:30px}.mark i{font-style:italic}.dot{color:#a3245c;font-size:14px;vertical-align:super}
    h1{font-family:N;font-weight:400;font-size:68px;line-height:1;margin-top:34px}
    p{margin-top:18px;font-size:20px;color:rgba(243,240,232,.78);max-width:420px;line-height:1.45}
  </style></head><body><div class="img"></div><div class="scrim"></div><div class="t">
    <div class="mark"><i>The</i>Private<span class="dot">●</span></div>
    <h1>Where <i>to?</i></h1>
    <p>Private flights arranged with licensed flight partners, from one request.</p>
  </div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, 'play', 'feature-graphic-1024x500.png') });
  await page.close();
  console.log('feature graphic');
}

// ---- Screenshots -------------------------------------------------------------------------------
const sizes = [
  { dir: 'play', name: 'phone', viewport: { width: 360, height: 640 }, scale: 3 }, // 1080×1920
  { dir: 'appstore', name: 'iphone-6.7', viewport: { width: 430, height: 932 }, scale: 3 }, // 1290×2796
];
const future = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);

for (const s of sizes) {
  mkdirSync(path.join(out, s.dir), { recursive: true });
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.scale, isMobile: true, hasTouch: true, locale: 'en-GB', timezoneId: 'Asia/Kolkata' });
  const p = await ctx.newPage();
  let n = 0;
  const shot = async (label) => {
    await p.waitForLoadState('networkidle');
    for (let i = 0; i < 3; i++) await p.locator('[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, s.dir, `${s.name}-${++n}-${label}.png`) });
  };
  await p.goto(`${APP}/discover`);
  await shot('discover');
  await p.getByRole('link', { name: 'Plan', exact: true }).click();
  await p.getByRole('button', { name: /^From/ }).click();
  await p.getByLabel('Search airports').fill('mumbai');
  await p.getByRole('button', { name: /BOM/ }).first().waitFor();
  await shot('airport-search');
  await p.getByRole('button', { name: /BOM/ }).first().click();
  await p.getByRole('button', { name: /^To/ }).click();
  await p.getByLabel('Search airports').fill('dubai');
  await p.getByRole('button', { name: /DXB/ }).first().click();
  await p.getByLabel('Departure date').fill(future);
  await p.getByLabel('More passengers').click();
  await p.getByLabel('More passengers').click();
  await shot('planner');
  await p.getByRole('button', { name: 'Send a flight request' }).click();
  await p.getByRole('link', { name: 'Create an account' }).click();
  await p.getByLabel('Full name').fill('Aisha Rahman');
  await p.getByLabel('E-mail').fill(`store.${Date.now()}@example.test`);
  await p.getByLabel('Password').fill('correct-horse-battery');
  await p.locator('input[type=checkbox]').check();
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL('**/plan/request');
  await p.getByLabel('Anything we should know?').fill('Two golf bags. Vegetarian catering, please.');
  await shot('request');
  await p.getByRole('button', { name: 'Send request' }).click();
  await p.waitForURL('**/journeys/request/**');
  await shot('request-sent');
  await p.getByRole('button', { name: 'Back' }).click();
  await p.getByRole('link', { name: 'Journeys', exact: true }).click();
  await shot('journeys');
  // Explore is not captured: test data contains sample listings that are not real offers.
  await ctx.close();
  console.log('screenshots', s.name);
}
await browser.close();
