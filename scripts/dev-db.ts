/**
 * Local PostgreSQL for development and tests (no Docker/system install required).
 * Data lives in ./.data/postgres (git-ignored). Production uses a managed PostgreSQL.
 *
 *   npm run db:start            – start (initialises on first run) and keep running
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL ?? 'postgresql://theprivate:theprivate@127.0.0.1:54329/theprivate');
const databaseDir = path.resolve('.data/postgres');
const dbNames = [url.pathname.slice(1), `${url.pathname.slice(1)}_test`];

const pg = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  // UTF-8 regardless of the host OS locale (Windows defaults to WIN1252, which cannot store ₹ etc.).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
});

async function main() {
  if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  for (const name of dbNames) {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (exists.rowCount === 0) await pg.createDatabase(name);
  }
  for (const name of dbNames) {
    const c = pg.getPgClient(name);
    await c.connect();
    await c.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await c.end();
  }
  await client.end();
  console.log(`PostgreSQL ready on ${url.hostname}:${url.port} (databases: ${dbNames.join(', ')}). Ctrl+C to stop.`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30);
}

main().catch(async (err) => {
  console.error(err);
  await pg.stop().catch(() => {});
  process.exit(1);
});
