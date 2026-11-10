/**
 * Dev utility: captures frames of the homepage film at given scroll progress values.
 *   npx tsx scripts/film-frames.ts [0,0.1,...] [--mobile]
 * Writes .data/film/p-<progress>.png and reports console/page errors.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const mobile = process.argv.includes('--mobile');
const list = process.argv.find((a) => a.startsWith('['));
const points: number[] = list ? JSON.parse(list) : [0, 0.08, 0.16, 0.24, 0.29, 0.33, 0.38, 0.45, 0.52, 0.6, 0.66, 0.72, 0.78, 0.84, 0.9, 0.97];
mkdirSync('.data/film', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true } : { viewport: { width: 1440, height: 810 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 180_000 });
await page.waitForTimeout(3500);
for (const p of points) {
  await page.evaluate((p) => {
    const el = document.querySelector('section[aria-label^="ThePrivate: a flight"]') as HTMLElement;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * (el.offsetHeight - window.innerHeight), behavior: 'instant' as ScrollBehavior });
  }, p);
  await page.waitForTimeout(2600);
  // Passed as a string: tsx would inject a __name helper that does not exist in the page.
  const fps = await page.evaluate<number>(`new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); })`);
  await page.screenshot({ path: `.data/film/${mobile ? 'm-' : ''}p-${p.toFixed(2)}.png` });
  console.log('captured', p, `${fps} fps`);
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no errors');
await browser.close();
