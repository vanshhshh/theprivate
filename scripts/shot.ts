/**
 * Dev utility: screenshot pages and report console errors / failed requests.
 *   npx tsx scripts/shot.ts /path [/path2 …] [--mobile] [--out dir]
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1]! : '.data/shots';
const paths = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
const base = process.env.BASE_URL ?? 'http://localhost:3000';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
await ctx.close();
const context = await browser.newContext({ ...(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } }), reducedMotion: 'reduce' });
if (process.env.COOKIE) await context.addCookies(JSON.parse(process.env.COOKIE));
for (const p of paths) {
  const page = await context.newPage();
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
  const res = await page.goto(base + p, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(1600);
  const file = path.join(out, `${p.replace(/[^\w]+/g, '_') || 'home'}${mobile ? '_m' : ''}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${res?.status()} ${p} → ${file}${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
  await page.close();
}
await browser.close();
