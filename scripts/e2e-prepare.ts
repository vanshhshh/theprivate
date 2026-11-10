/**
 * Prepares the isolated *_test database for end-to-end tests:
 * migrate → truncate → reference airports → the real bundle import (same code path as apply).
 * Refuses to run against any database whose name does not end in "_test".
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = new URL(process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL!);
if (!url.pathname.endsWith('_test')) url.pathname = `${url.pathname}_test`;
process.env.DATABASE_URL = url.toString();
if (!url.pathname.endsWith('_test')) throw new Error('Refusing: not a *_test database');

execSync('npx prisma migrate deploy', { env: process.env, stdio: 'pipe' });
const { prisma } = await import('@/server/db/client');
const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);

const { importAirports } = await import('@/server/reference/airports');
console.log('airports', await importAirports());

const { loadAllSources } = await import('@/server/import/cli');
const { buildImportPlan } = await import('@/domain/imports/plan');
const { planHash } = await import('@/domain/imports/hash');
const { applyPlan } = await import('@/server/import/apply');
const loaded = await loadAllSources(path.resolve('ThePrivate_Aviation_Database_Bundle'));
const plan = buildImportPlan(loaded);
const r = await applyPlan(plan, planHash(plan), loaded, 'e2e');
console.log('import batch', r.batchId);
await prisma.$disconnect();
