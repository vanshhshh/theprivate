/**
 * Dev utility: signs in as each role on a server backed by the E2E test database and captures
 * full-page screenshots of key screens (reduced motion so scroll-linked reveals are settled).
 *   BASE_URL=http://localhost:3100 npx tsx scripts/review-shots.ts
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3100';
const out = '.data/review';
mkdirSync(out, { recursive: true });
const pg = await import('pg');
const db = new pg.default.Client({ connectionString: process.env.REVIEW_DB });
await db.connect();
const email = async (like: string) => (await db.query('select email from "User" where email like $1 order by "createdAt" desc limit 1', [like])).rows[0]?.email as string;
const [customer, operator, admin] = [await email('asha.%'), await email('ops.%'), await email('admin.%')];
const ref = async (sql: string) => (await db.query(sql)).rows[0] as Record<string, string>;
const trip = await ref(`select r.reference from "Rfq" r join "Booking" b on b."rfqId" = r.id order by r."createdAt" desc limit 1`);
const booking = await ref(`select reference from "Booking" order by "createdAt" desc limit 1`);
const leg = await ref(`select id from "EmptyLegListing" order by "createdAt" desc limit 1`);
const listing = await ref(`select slug from "SaleListing" where status = 'PUBLISHED' limit 1`);
const op = await ref(`select o.id from "Operator" o where o.lifecycle = 'ACTIVE' limit 1`);
const bom = await ref(`select id from "Airport" where iata = 'BOM'`);
const del = await ref(`select id from "Airport" where iata = 'DEL'`);
await db.end();

const browser = await chromium.launch();
async function session(user?: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  if (user) {
    await page.goto(`${base}/sign-in`);
    await page.getByLabel('E-mail').fill(user);
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/account');
  }
  return page;
}
async function shot(page: Page, name: string, path: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const res = await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(`${res?.status()} ${name} ${path}${errors.length ? ` ERR ${errors.join(' | ')}` : ''}`);
}

const anon = await session();
const date = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10);
await shot(anon, 'charter-results', `/charter?trip=ONE_WAY&from=${bom.id}&to=${del.id}&date=${date}&pax=4`);
await shot(anon, 'empty-legs', '/empty-legs');
await shot(anon, 'empty-leg', `/empty-legs/${leg.id}`);
await shot(anon, 'sale-listing', `/aircraft-for-sale/${listing.slug}`);
await shot(anon, 'sale-gallery', '/aircraft-for-sale');
await shot(anon, 'partners', '/operators');
const c = await session(customer);
await shot(c, 'trip', `/account/trips/${trip.reference}`);
await shot(c, 'booking', `/account/bookings/${booking.reference}`);
await shot(c, 'account', '/account');
await shot(c, 'trips', '/account/trips');
await shot(c, 'listings', '/account/listings');
const o = await session(operator);
await shot(o, 'operator-overview', '/operator');
await shot(o, 'operator-fleet', '/operator/fleet');
await shot(o, 'operator-requests', '/operator/requests');
const a = await session(admin);
await shot(a, 'admin-overview', '/admin');
await shot(a, 'admin-operator', `/admin/operators/${op.id}`);
await shot(a, 'admin-matches', '/admin/data/matches');
await browser.close();
