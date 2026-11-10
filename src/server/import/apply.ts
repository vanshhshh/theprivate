/**
 * Writes an ImportPlan to the database: one transaction, idempotent, provenance-preserving.
 *
 * Rules
 * - Entities are found by ExternalIdentifier (never by name), so re-runs update, not duplicate.
 * - Imports never change lifecycle, review status, charter eligibility or public visibility.
 * - "Protected" data is never overwritten by an import: operators past DISCOVERED (they manage
 *   their own profile), aircraft past IMPORTED_UNREVIEWED, admin-verified authorisations,
 *   reviewed conflicts and reviewed match candidates. The would-be change is counted instead.
 * - The same code computes the database diff for a dry run inside a transaction that is always
 *   rolled back, so the diff reflects exactly what apply would do.
 */
import { canonicalJson, contentHash } from '@/domain/imports/hash';
import { orgMatchKey } from '@/domain/imports/normalize';
import type { DbDiff } from '@/domain/imports/report';
import type { ImportPlan, LoadedSource, Observation, PlannedOperator } from '@/domain/imports/types';
import { Prisma } from '@/generated/prisma/client';
import { prisma, type Tx } from '@/server/db/client';

class DryRunRollback extends Error {}

const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', dialCode: '+91', isLaunchMarket: true },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', dialCode: '+971', isLaunchMarket: false },
];

type Counter = Record<string, DbDiff>;
function counter(): Counter {
  return {};
}
function bump(c: Counter, entity: string, kind: 'create' | 'update' | 'unchanged' | 'protectedFields', n = 1) {
  c[entity] ??= { entity, create: 0, update: 0, unchanged: 0, protectedFields: 0 };
  c[entity][kind] += n;
}

function jsonSafe(v: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(v, (_k, val) => (val instanceof Date ? val.toISOString() : val))) as Prisma.InputJsonValue;
}

// Key-order-insensitive: PostgreSQL jsonb does not preserve object key order.
const same = (a: unknown, b: unknown) => canonicalJson(jsonSafe(a ?? null)) === canonicalJson(jsonSafe(b ?? null));
const toDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

async function externalId(tx: Tx, namespace: string, value: string) {
  return tx.externalIdentifier.findUnique({ where: { namespace_value: { namespace, value } } });
}

function splitKey(key: string): [string, string] {
  const i = key.indexOf(':');
  return [key.slice(0, i), key.slice(i + 1)];
}

async function uniqueSlug(tx: Tx, base: string, country: string): Promise<string> {
  const root = base || 'operator';
  for (const candidate of [root, `${root}-${country.toLowerCase()}`, ...Array.from({ length: 50 }, (_, i) => `${root}-${country.toLowerCase()}-${i + 2}`)]) {
    if (!(await tx.operator.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  throw new Error(`Could not allocate slug for ${base}`);
}

interface RunContext {
  tx: Tx;
  batchId: string | null; // null in diff mode (no batch row exists)
  counts: Counter;
  changes: { entityType: string; entityId: string; action: 'CREATE' | 'UPDATE'; before: unknown; after: unknown }[];
  ids: Map<string, string>; // plan key → entity id
}

async function run(plan: ImportPlan, loaded: LoadedSource[], ctx: RunContext) {
  const { tx, counts } = ctx;

  // ---- Reference data & sources ------------------------------------------------------------
  for (const c of COUNTRIES) {
    const existing = await tx.country.findUnique({ where: { code: c.code } });
    if (!existing) {
      await tx.country.create({ data: c });
      bump(counts, 'Country', 'create');
    } else bump(counts, 'Country', 'unchanged');
  }

  const sourceIds = new Map<string, string>();
  for (const s of loaded) {
    const d = s.descriptor;
    const data = { fileName: d.fileName, kind: d.kind, role: d.role, country: d.country, description: d.description, asOf: toDate(d.asOf), latestSha256: s.sha256 };
    const existing = await tx.dataSource.findUnique({ where: { code: d.code } });
    if (!existing) {
      sourceIds.set(d.code, (await tx.dataSource.create({ data: { code: d.code, ...data } })).id);
      bump(counts, 'DataSource', 'create');
    } else {
      sourceIds.set(d.code, existing.id);
      if (existing.latestSha256 !== s.sha256) {
        await tx.dataSource.update({ where: { id: existing.id }, data });
        bump(counts, 'DataSource', 'update');
      } else bump(counts, 'DataSource', 'unchanged');
    }
  }

  // ---- Source records (every row of every sheet) -------------------------------------------
  const changedRows = new Set<string>(); // "code|sheet|row" whose content changed → refresh observations
  for (const s of loaded) {
    const dataSourceId = sourceIds.get(s.descriptor.code)!;
    const existing = await tx.sourceRecord.findMany({ where: { dataSourceId }, select: { id: true, sheet: true, rowNumber: true, contentHash: true } });
    const byKey = new Map(existing.map((e) => [`${e.sheet}|${e.rowNumber}`, e]));
    const toCreate: Prisma.SourceRecordCreateManyInput[] = [];
    for (const sheet of s.sheets) {
      for (const row of sheet.rows) {
        const raw = jsonSafe(row.cells);
        const hash = contentHash(raw);
        const prev = byKey.get(`${sheet.name}|${row.ref.row}`);
        if (!prev) {
          if (ctx.batchId) toCreate.push({ dataSourceId, sheet: sheet.name, rowNumber: row.ref.row, contentHash: hash, raw, firstBatchId: ctx.batchId, lastSeenBatchId: ctx.batchId });
          bump(counts, 'SourceRecord', 'create');
        } else if (prev.contentHash !== hash) {
          changedRows.add(`${s.descriptor.code}|${sheet.name}|${row.ref.row}`);
          if (ctx.batchId) await tx.sourceRecord.update({ where: { id: prev.id }, data: { contentHash: hash, raw, lastSeenBatchId: ctx.batchId } });
          bump(counts, 'SourceRecord', 'update');
        } else bump(counts, 'SourceRecord', 'unchanged');
      }
    }
    if (toCreate.length) await tx.sourceRecord.createMany({ data: toCreate });
  }

  // ---- Aircraft types ------------------------------------------------------------------------
  const typeIds = new Map<string, string>();
  for (const t of plan.aircraftTypes) {
    const existing = await tx.aircraftType.findUnique({ where: { key: t.key } });
    if (existing) {
      typeIds.set(t.key, existing.id);
      bump(counts, 'AircraftType', 'unchanged'); // admin may have curated it; never overwritten
    } else {
      typeIds.set(t.key, (await tx.aircraftType.create({ data: t })).id);
      bump(counts, 'AircraftType', 'create');
    }
  }

  // ---- Operators -----------------------------------------------------------------------------
  for (const op of plan.operators) await upsertOperator(ctx, op);

  // ---- Aircraft --------------------------------------------------------------------------------
  for (const a of plan.aircraft) {
    const operatorId = ctx.ids.get(a.operatorKey)!;
    const data = {
      modelRaw: a.modelRaw,
      aircraftTypeId: a.typeKey ? typeIds.get(a.typeKey)! : null,
      typeResolution: a.typeResolution,
      typeFamilyHint: a.typeFamilyHint,
      airframeClass: a.airframeClass,
      seats: a.seats,
      seatsRaw: a.seatsRaw,
      isCargo: a.isCargo,
      isAerialWork: a.isAerialWork,
      evidenceLevel: a.evidenceLevel,
      sourceStatusRaw: a.sourceStatusRaw,
      usageRaw: a.usageRaw,
      sourceUrl: a.sourceUrl,
      sourceNote: a.note,
      attributionUncertain: a.attributionUncertain,
      dataQualityFlags: a.dataQualityFlags,
    };
    const [ns, value] = splitKey(a.key);
    const ext = await externalId(tx, ns, value);
    const existing = ext ? await tx.aircraft.findUnique({ where: { id: ext.entityId } }) : await tx.aircraft.findUnique({ where: { registration: a.registration } });
    if (!existing) {
      const created = await tx.aircraft.create({ data: { ...data, registration: a.registration, operatorId, reviewStatus: 'IMPORTED_UNREVIEWED', charterEligible: false } });
      await tx.externalIdentifier.create({ data: { namespace: ns, value, entityType: 'Aircraft', entityId: created.id } });
      ctx.ids.set(a.key, created.id);
      ctx.changes.push({ entityType: 'Aircraft', entityId: created.id, action: 'CREATE', before: null, after: data });
      bump(counts, 'Aircraft', 'create');
      continue;
    }
    ctx.ids.set(a.key, existing.id);
    if (!ext) await tx.externalIdentifier.create({ data: { namespace: ns, value, entityType: 'Aircraft', entityId: existing.id } });
    const before = Object.fromEntries(Object.keys(data).map((k) => [k, existing[k as keyof typeof existing]]));
    const changedFields = Object.keys(data).filter((k) => !same(before[k], data[k as keyof typeof data]));
    if (existing.operatorId !== operatorId) bump(counts, 'Aircraft', 'protectedFields'); // operator re-attribution needs review, never automatic
    if (!changedFields.length) bump(counts, 'Aircraft', 'unchanged');
    else if (existing.reviewStatus !== 'IMPORTED_UNREVIEWED') bump(counts, 'Aircraft', 'protectedFields', changedFields.length);
    else {
      await tx.aircraft.update({ where: { id: existing.id }, data });
      ctx.changes.push({ entityType: 'Aircraft', entityId: existing.id, action: 'UPDATE', before, after: data });
      bump(counts, 'Aircraft', 'update');
    }
  }

  // ---- Fleet evidence ------------------------------------------------------------------------
  for (const f of plan.fleetEvidence) {
    const data = {
      operatorId: ctx.ids.get(f.operatorKey)!,
      aircraftTypeId: f.typeKey ? typeIds.get(f.typeKey)! : null,
      modelRaw: f.modelRaw,
      typeResolution: f.typeResolution,
      seats: f.seats,
      reportedCount: f.reportedCount,
      usageRaw: f.usageRaw,
      evidenceLevel: f.evidenceLevel,
      sourceStatusRaw: f.sourceStatusRaw,
      sourceUrl: f.sourceUrl,
      sourceType: f.sourceType,
      note: f.note,
    };
    const id = await upsertSimple(ctx, 'FleetEvidence', f.key, data, (t) => t.fleetEvidence);
    ctx.ids.set(f.key, id);
  }

  // ---- Registry & evidence sources -------------------------------------------------------------
  for (const r of plan.registryEntries) {
    await upsertSimple(ctx, 'AuthorityRegistryEntry', r.key, {
      authority: r.authority,
      organizationName: r.organizationName,
      approvalNumberRaw: r.approvalNumberRaw,
      approvalNumber: r.approvalNumber,
      organizationType: r.organizationType,
      issueDate: toDate(r.issueDate),
      expiryDate: toDate(r.expiryDate),
      country: r.country,
      operatorId: r.linkedOperatorKey ? ctx.ids.get(r.linkedOperatorKey)! : null,
      sourceCode: r.ref.source,
    }, (t) => t.authorityRegistryEntry);
  }
  for (const e of plan.evidenceSources) {
    await upsertSimple(ctx, 'EvidenceSource', e.key, { label: e.label, organization: e.organization, sourceType: e.sourceType, asOf: e.asOf, url: e.url, usage: e.usage, sourceCode: e.ref.source }, (t) => t.evidenceSource);
  }

  // ---- Conflicts & match candidates (reviewed ones are never reopened) ------------------------
  for (const c of plan.conflicts) {
    const conflictKey = `${c.entityKey}|${c.field}`;
    const values = jsonSafe(c.values.map((v) => ({ value: v.value, source: v.ref.source, sheet: v.ref.sheet, row: v.ref.row, trust: v.trust })));
    const data = {
      entityType: c.entityType,
      entityKey: c.entityKey,
      entityId: ctx.ids.get(c.entityKey) ?? null,
      field: c.field,
      values,
      status: c.resolution === 'OPEN' ? ('OPEN' as const) : ('AUTO_RESOLVED' as const),
      chosenValue: jsonSafe(c.chosen),
      reason: c.reason,
    };
    const existing = await tx.dataConflict.findUnique({ where: { conflictKey } });
    if (!existing) {
      await tx.dataConflict.create({ data: { conflictKey, ...data } });
      bump(counts, 'DataConflict', 'create');
    } else if (existing.status === 'RESOLVED' || existing.status === 'DISMISSED') {
      bump(counts, 'DataConflict', same(existing.values, values) ? 'unchanged' : 'protectedFields');
    } else if (!same(existing.values, values) || existing.status !== data.status) {
      await tx.dataConflict.update({ where: { id: existing.id }, data });
      bump(counts, 'DataConflict', 'update');
    } else bump(counts, 'DataConflict', 'unchanged');
  }
  for (const m of plan.matchCandidates) {
    const where = { entityType_leftKey_rightKey: { entityType: m.entityType, leftKey: m.leftKey, rightKey: m.rightKey } };
    const data = { score: new Prisma.Decimal(m.score), reasons: m.reasons, recommendation: m.recommendation };
    const existing = await tx.matchCandidate.findUnique({ where });
    if (!existing) {
      await tx.matchCandidate.create({ data: { entityType: m.entityType, leftKey: m.leftKey, rightKey: m.rightKey, ...data } });
      bump(counts, 'MatchCandidate', 'create');
    } else if (existing.status !== 'PENDING') bump(counts, 'MatchCandidate', 'unchanged');
    else if (!same(existing.reasons, m.reasons) || existing.recommendation !== m.recommendation) {
      await tx.matchCandidate.update({ where: { id: existing.id }, data });
      bump(counts, 'MatchCandidate', 'update');
    } else bump(counts, 'MatchCandidate', 'unchanged');
  }

  // ---- Field observations ---------------------------------------------------------------------
  const obsRows: Prisma.FieldObservationCreateManyInput[] = [];
  const addObs = (entityType: string, key: string, list: Observation[]) => {
    const entityId = ctx.ids.get(key);
    if (!entityId || !ctx.batchId) return;
    for (const o of list) {
      obsRows.push({
        entityType,
        entityId,
        field: o.field,
        value: jsonSafe(o.value),
        sourceCode: o.ref.source,
        sheet: o.ref.sheet,
        rowNumber: o.ref.row,
        fieldGroup: o.group,
        confidence: o.confidence,
        batchId: ctx.batchId,
      });
    }
  };
  for (const op of plan.operators) addObs('Operator', op.key, op.observations);
  for (const a of plan.aircraft) addObs('Aircraft', a.key, a.observations);
  if (ctx.batchId && changedRows.size) {
    for (const k of changedRows) {
      const [sourceCode, sheet, row] = k.split('|');
      await tx.fieldObservation.deleteMany({ where: { sourceCode, sheet, rowNumber: Number(row) } });
    }
  }
  if (obsRows.length) {
    const res = await tx.fieldObservation.createMany({ data: obsRows, skipDuplicates: true });
    bump(counts, 'FieldObservation', 'create', res.count);
    bump(counts, 'FieldObservation', 'unchanged', obsRows.length - res.count);
  }
}

async function upsertSimple<T extends { id: string }>(
  ctx: RunContext,
  entity: string,
  externalKey: string,
  data: Record<string, unknown>,
  model: (tx: Tx) => {
    findUnique(args: { where: { externalKey: string } }): Promise<(T & Record<string, unknown>) | null>;
    create(args: { data: Record<string, unknown> }): Promise<T>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<T>;
  },
): Promise<string> {
  const m = model(ctx.tx);
  const existing = await m.findUnique({ where: { externalKey } });
  if (!existing) {
    const created = await m.create({ data: { externalKey, ...data } });
    ctx.changes.push({ entityType: entity, entityId: created.id, action: 'CREATE', before: null, after: data });
    bump(ctx.counts, entity, 'create');
    return created.id;
  }
  const before = Object.fromEntries(Object.keys(data).map((k) => [k, existing[k]]));
  if (Object.keys(data).every((k) => same(before[k], data[k]))) {
    bump(ctx.counts, entity, 'unchanged');
  } else {
    await m.update({ where: { id: existing.id }, data });
    ctx.changes.push({ entityType: entity, entityId: existing.id, action: 'UPDATE', before, after: data });
    bump(ctx.counts, entity, 'update');
  }
  return existing.id;
}

async function upsertOperator(ctx: RunContext, op: PlannedOperator) {
  const { tx, counts } = ctx;
  const profile = {
    legalName: op.legalName,
    displayName: op.displayName,
    website: op.website,
    linkedinUrl: op.linkedinUrl,
    instagramHandle: op.instagramHandle,
    headquartersAddress: op.address,
    baseDescription: op.baseDescription,
    researchRelevance: op.marketplaceRelevance,
    researchCharterActivity: op.charterActivity,
    researchOperatorKind: op.operatorKind,
    dataQualityFlags: op.dataQualityFlags,
  };
  const [ns, value] = splitKey(op.key);
  const ext = await externalId(tx, ns, value);
  let operatorId: string;
  let protectedProfile = false;
  if (!ext) {
    const created = await tx.operator.create({
      data: { ...profile, slug: await uniqueSlug(tx, op.slugBase, op.country), countryCode: op.country, lifecycle: 'DISCOVERED', isPubliclyListed: false },
    });
    operatorId = created.id;
    await tx.externalIdentifier.create({ data: { namespace: ns, value, entityType: 'Operator', entityId: operatorId } });
    ctx.changes.push({ entityType: 'Operator', entityId: operatorId, action: 'CREATE', before: null, after: profile });
    bump(counts, 'Operator', 'create');
  } else {
    operatorId = ext.entityId;
    const existing = await tx.operator.findUniqueOrThrow({ where: { id: operatorId } });
    const before = Object.fromEntries(Object.keys(profile).map((k) => [k, existing[k as keyof typeof existing]]));
    const changed = Object.keys(profile).filter((k) => !same(before[k], profile[k as keyof typeof profile]));
    // Once an operator has claimed its profile, the operator and staff own it; imports stop writing.
    protectedProfile = existing.lifecycle !== 'DISCOVERED';
    if (!changed.length) bump(counts, 'Operator', 'unchanged');
    else if (protectedProfile) bump(counts, 'Operator', 'protectedFields', changed.length);
    else {
      await tx.operator.update({ where: { id: operatorId }, data: profile });
      ctx.changes.push({ entityType: 'Operator', entityId: operatorId, action: 'UPDATE', before, after: profile });
      bump(counts, 'Operator', 'update');
    }
  }
  ctx.ids.set(op.key, operatorId);

  for (const alias of op.aliases) {
    const exists = await tx.operatorAlias.findUnique({ where: { operatorId_alias: { operatorId, alias } } });
    if (exists) bump(counts, 'OperatorAlias', 'unchanged');
    else {
      await tx.operatorAlias.create({ data: { operatorId, alias, matchKey: orgMatchKey(alias), source: op.refs[0]?.source ?? null } });
      bump(counts, 'OperatorAlias', 'create');
    }
  }

  for (const a of op.authorizations) {
    const where = { operatorId_authority_certificateType: { operatorId, authority: a.authority, certificateType: a.certificateType } };
    const data = {
      numberRaw: a.numberRaw,
      numberNormalized: a.numberNormalized,
      numberStatus: a.numberStatus,
      validFrom: toDate(a.validFrom),
      validUntil: toDate(a.validUntil),
      validUntilRaw: a.validUntilRaw,
      scope: a.scope,
      source: a.ref.source,
    };
    const existing = await tx.operatorAuthorization.findUnique({ where });
    if (!existing) {
      await tx.operatorAuthorization.create({ data: { operatorId, authority: a.authority, certificateType: a.certificateType, ...data } });
      bump(counts, 'OperatorAuthorization', 'create');
    } else {
      const changed = Object.keys(data).some((k) => !same(existing[k as keyof typeof existing], data[k as keyof typeof data]));
      if (!changed) bump(counts, 'OperatorAuthorization', 'unchanged');
      else if (existing.verifiedAt) bump(counts, 'OperatorAuthorization', 'protectedFields'); // admin-verified wins
      else {
        await tx.operatorAuthorization.update({ where: { id: existing.id }, data });
        bump(counts, 'OperatorAuthorization', 'update');
      }
    }
  }

  for (const c of op.contacts) {
    const data = { kind: c.kind, name: c.name, title: c.title, emails: c.emails, phones: c.phones, unparsedPhones: c.unparsedPhones, sourceUrl: c.sourceUrl, note: c.note, confidence: c.confidence };
    const existing = await tx.operatorContact.findUnique({ where: { externalKey: c.key } });
    if (!existing) {
      const created = await tx.operatorContact.create({ data: { operatorId, externalKey: c.key, ...data } });
      ctx.ids.set(c.key, created.id);
      bump(counts, 'OperatorContact', 'create');
      continue;
    }
    ctx.ids.set(c.key, existing.id);
    const changed = Object.keys(data).some((k) => !same(existing[k as keyof typeof existing], data[k as keyof typeof data]));
    if (!changed) bump(counts, 'OperatorContact', 'unchanged');
    else if (existing.deletedAt || existing.doNotContact || protectedProfile) bump(counts, 'OperatorContact', 'protectedFields');
    else {
      await tx.operatorContact.update({ where: { id: existing.id }, data });
      bump(counts, 'OperatorContact', 'update');
    }
  }
}

const TX_OPTIONS = { timeout: 10 * 60_000, maxWait: 30_000, isolationLevel: 'Serializable' as const };

/** Dry-run diff: executes the full apply inside a transaction that is always rolled back. */
export async function diffAgainstDatabase(plan: ImportPlan, loaded: LoadedSource[]): Promise<DbDiff[]> {
  const counts = counter();
  try {
    await prisma.$transaction(async (tx) => {
      await run(plan, loaded, { tx, batchId: null, counts, changes: [], ids: new Map() });
      throw new DryRunRollback();
    }, TX_OPTIONS);
  } catch (e) {
    if (!(e instanceof DryRunRollback)) throw e;
  }
  return Object.values(counts).sort((a, b) => a.entity.localeCompare(b.entity));
}

export async function applyPlan(plan: ImportPlan, planHash: string, loaded: LoadedSource[], actor: string) {
  const sourceHashes = Object.fromEntries(loaded.map((l) => [l.descriptor.code, l.sha256]));
  const batch = await prisma.importBatch.create({ data: { mode: 'APPLY', planHash, sourceHashes, initiatedBy: `cli:${actor}` } });
  const counts = counter();
  try {
    await prisma.$transaction(async (tx) => {
      const ctx: RunContext = { tx, batchId: batch.id, counts, changes: [], ids: new Map() };
      await run(plan, loaded, ctx);
      if (ctx.changes.length) {
        await tx.importChange.createMany({
          data: ctx.changes.map((c) => ({ batchId: batch.id, entityType: c.entityType, entityId: c.entityId, action: c.action, before: c.before === null ? Prisma.JsonNull : jsonSafe(c.before), after: jsonSafe(c.after) })),
        });
      }
      await tx.auditEvent.create({
        data: { actorType: 'IMPORT', action: 'import.apply', entityType: 'ImportBatch', entityId: batch.id, after: jsonSafe({ planHash, summary: Object.values(counts) }) },
      });
    }, TX_OPTIONS);
    const summary = Object.values(counts).sort((a, b) => a.entity.localeCompare(b.entity));
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: 'SUCCEEDED', finishedAt: new Date(), summary: jsonSafe(summary) } });
    return { batchId: batch.id, planHash, summary };
  } catch (e) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: 'FAILED', finishedAt: new Date(), error: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
}

