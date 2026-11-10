/**
 * Integration: applies the real import plan to the isolated *_test database twice.
 * Requires the dev PostgreSQL to be running (`npm run db:start`). Never touches the dev database.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

if (existsSync('.env')) process.loadEnvFile('.env');
const base = new URL(process.env.DATABASE_URL!);
base.pathname = `${base.pathname}_test`;
process.env.DATABASE_URL = base.toString(); // must be set before the Prisma client module loads

const dir = path.resolve('ThePrivate_Aviation_Database_Bundle');

describe.skipIf(!existsSync(dir))('import apply (test database)', () => {
  let prisma: typeof import('@/server/db/client').prisma;
  let apply: typeof import('@/server/import/apply');
  let plan: import('@/domain/imports/types').ImportPlan;
  let loaded: import('@/domain/imports/types').LoadedSource[];
  let hash: string;

  beforeAll(async () => {
    if (!base.pathname.endsWith('_test')) throw new Error('Refusing to run: not a *_test database');
    execSync('npx prisma migrate deploy', { env: process.env, stdio: 'pipe' });
    ({ prisma } = await import('@/server/db/client'));
    // Clean slate for the isolated test database only (guarded above).
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length) await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
    apply = await import('@/server/import/apply');
    const { loadAllSources } = await import('@/server/import/cli');
    const { buildImportPlan } = await import('@/domain/imports/plan');
    const { planHash } = await import('@/domain/imports/hash');
    loaded = await loadAllSources(dir);
    plan = buildImportPlan(loaded);
    hash = planHash(plan);
  }, 300_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('first apply creates everything in one batch', async () => {
    const r = await apply.applyPlan(plan, hash, loaded, 'test');
    const op = r.summary.find((s) => s.entity === 'Operator')!;
    expect(op.create).toBe(149);
    expect(await prisma.aircraft.count()).toBe(494);
    expect(await prisma.fleetEvidence.count()).toBe(42);
    expect(await prisma.importBatch.count({ where: { status: 'SUCCEEDED' } })).toBe(1);
  }, 600_000);

  it('nothing imported is public, verified or bookable', async () => {
    expect(await prisma.operator.count({ where: { OR: [{ lifecycle: { not: 'DISCOVERED' } }, { isPubliclyListed: true }] } })).toBe(0);
    expect(await prisma.aircraft.count({ where: { OR: [{ charterEligible: true }, { reviewStatus: { not: 'IMPORTED_UNREVIEWED' } }] } })).toBe(0);
    expect(await prisma.emptyLegListing.count()).toBe(0);
    expect(await prisma.saleListing.count()).toBe(0);
  });

  it('preserves provenance for every source row and conflicts for review', async () => {
    const rows = plan.sources.reduce((n, s) => n + s.sheets.reduce((m, sh) => m + sh.rows, 0), 0);
    expect(await prisma.sourceRecord.count()).toBe(rows);
    expect(await prisma.dataConflict.count({ where: { status: 'OPEN' } })).toBe(1);
    expect(await prisma.fieldObservation.count()).toBeGreaterThan(1000);
  });

  it('second apply is a no-op (idempotent)', async () => {
    const r = await apply.applyPlan(plan, hash, loaded, 'test');
    for (const s of r.summary) {
      expect({ entity: s.entity, create: s.create, update: s.update }).toEqual({ entity: s.entity, create: 0, update: 0 });
    }
    expect(await prisma.operator.count()).toBe(149);
    expect(await prisma.aircraft.count()).toBe(494);
  }, 600_000);

  it('never overwrites an operator once it has left DISCOVERED', async () => {
    const ext = await prisma.externalIdentifier.findUniqueOrThrow({ where: { namespace_value: { namespace: 'IN-NSOP-MASTER', value: '1' } } });
    await prisma.operator.update({ where: { id: ext.entityId }, data: { lifecycle: 'CLAIMED', website: 'https://operator-edited.example/' } });
    const tampered = structuredClone(plan);
    tampered.operators.find((o) => o.key === 'IN-NSOP-MASTER:1')!.website = 'https://import-changed.example/';
    const diff = await apply.diffAgainstDatabase(tampered, loaded);
    expect(diff.find((d) => d.entity === 'Operator')?.protectedFields).toBe(1);
    const after = await prisma.operator.findUniqueOrThrow({ where: { id: ext.entityId } });
    expect(after.website).toBe('https://operator-edited.example/');
  }, 600_000);
});
