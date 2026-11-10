/**
 * Builds the static point set behind every route map: each active airport and heliport in the
 * reference table, as real coordinates. Read-only against the database.
 *
 *   npx tsx scripts/media/build_airport_map.ts
 *
 * Output: public/media/map/airports.json — { v, n, p: [lon×100, lat×100, weight, …] } where weight
 * is 2 for airports with scheduled service, 1 for other airports with an IATA code, 0 otherwise.
 * Rebuild when the airport reference data is re-imported.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';

if (process.env.DATABASE_URL === undefined) {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* no .env */
  }
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows } = await db.query<{ lon: number; lat: number; iata: string | null; sched: boolean }>(
  'select longitude::float as lon, latitude::float as lat, iata, "hasScheduledService" as sched from "Airport" where "isActive" order by "searchRank" desc nulls last',
);
await db.end();

const p: number[] = [];
for (const r of rows) p.push(Math.round(r.lon * 100), Math.round(r.lat * 100), r.sched ? 2 : r.iata ? 1 : 0);
mkdirSync('public/media/map', { recursive: true });
writeFileSync('public/media/map/airports.json', JSON.stringify({ v: 1, n: rows.length, p }));
console.log(`wrote ${rows.length} airports`);
