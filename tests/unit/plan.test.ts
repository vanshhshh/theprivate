/** Runs the real reconciler over the real bundle (read-only) and checks the invariants. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { planHash } from '@/domain/imports/hash';
import { buildImportPlan } from '@/domain/imports/plan';
import type { ImportPlan, LoadedSource } from '@/domain/imports/types';
import { loadAllSources } from '@/server/import/cli';

const dir = path.resolve('ThePrivate_Aviation_Database_Bundle');
const suite = existsSync(dir) ? describe : describe.skip;

suite('import plan over the supplied bundle', () => {
  let loaded: LoadedSource[];
  let plan: ImportPlan;
  beforeAll(async () => {
    loaded = await loadAllSources(dir);
    plan = buildImportPlan(loaded);
  });

  it('is deterministic', () => {
    expect(planHash(buildImportPlan(loaded))).toBe(planHash(plan));
  });
  it('treats India workbooks as layers of one 138-operator universe', () => {
    expect(plan.operators.filter((o) => o.country === 'IN')).toHaveLength(138);
    expect(plan.operators.filter((o) => o.country === 'AE')).toHaveLength(11);
  });
  it('rejects repeated header rows and keeps 460 India airframes, unique by registration', () => {
    expect(plan.rejected.filter((r) => /header/.test(r.reason))).toHaveLength(31);
    expect(plan.aircraft.filter((a) => a.registration.startsWith('VT-'))).toHaveLength(460);
    expect(new Set(plan.aircraft.map((a) => a.registration)).size).toBe(plan.aircraft.length);
  });
  it('never turns model-level evidence into aircraft', () => {
    expect(plan.aircraft.every((a) => a.registration)).toBe(true);
    expect(plan.fleetEvidence).toHaveLength(42);
    expect(plan.fleetEvidence.some((f) => /managed fleet/i.test(f.modelRaw))).toBe(true);
  });
  it('repairs the five swapped UAE status rows and flags the A6-RJC type contradiction', () => {
    expect(plan.repairs.filter((r) => /swapped/.test(r.reason))).toHaveLength(5);
    expect(plan.aircraft.find((a) => a.registration === 'A6-RJC')?.typeResolution).toBe('CONFLICT');
    expect(plan.conflicts.find((c) => c.entityKey === 'REG:A6-RJC')?.resolution).toBe('OPEN');
  });
  it('marks aircraft from interleaved DGCA rows as attribution-uncertain', () => {
    expect(plan.aircraft.find((a) => a.registration === 'VT-PHA')?.attributionUncertain).toBe(true);
    expect(plan.aircraft.find((a) => a.registration === 'VT-AFO')?.attributionUncertain).toBe(false);
  });
  it('links every UAE operator to the GCAA list by approval number', () => {
    expect(plan.registryEntries).toHaveLength(34);
    expect(plan.registryEntries.filter((r) => r.linkedOperatorKey)).toHaveLength(11);
  });
  it('drops the obfuscated e-mail instead of storing it', () => {
    const emails = plan.operators.flatMap((o) => o.contacts.flatMap((c) => c.emails));
    expect(emails.some((e) => /protected/.test(e))).toBe(false);
  });
});
