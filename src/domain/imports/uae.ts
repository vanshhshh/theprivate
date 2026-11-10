/**
 * UAE reconciliation.
 *
 * Layers: Aircraft_Verified (newest, primary) > Full_Enrichment > Operator_Enrichment (oldest).
 * The GCAA PDF is the authority for approval numbers and validity dates ONLY. Its other
 * organisations are imported as registry entries, not operators.
 * Aircraft rows WITH a registration become aircraft records; rows without one are model-level
 * fleet evidence and never become inventory.
 */
import { matchAircraftType, modelKey } from '../aircraft/type-catalog';
import { clean, nameSimilarity, normalizeGcaaApproval, normalizeRegistration, normalizeUrl, orgMatchKey, parseEmails, parseGcaaDate, parseInteger, parsePhones, slugify } from './normalize';
import { cell, comparable, observation, resolveLayered, type LayeredValue, type PlanBuilder, type SourceSet } from './shared';
import type { CellRow, EvidenceLevel, FieldGroup, Observation, PlannedAircraft, PlannedContact, PlannedFleetEvidence, PlannedOperator, SourceRef } from './types';

const VERIFIED = 'AE_AIRCRAFT_VERIFIED';
const FULL = 'AE_FULL_ENRICHMENT';
const LEGACY = 'AE_OPERATOR_ENRICHMENT';
const GCAA = 'AE_GCAA_APPROVED_OPERATORS';

const STATUSES = ['CURRENT_PUBLIC', 'RECENT_TRACKED', 'PUBLIC_MODEL_RECORD', 'MANAGED_NOT_AUTO_CHARTER', 'NEEDS_OPERATOR_CONFIRMATION'] as const;
type SourceStatus = (typeof STATUSES)[number];

const AIRCRAFT_EVIDENCE: Record<SourceStatus, EvidenceLevel> = {
  CURRENT_PUBLIC: 'OPERATOR_PUBLISHED_CURRENT',
  RECENT_TRACKED: 'FLIGHT_TRACKING_RECENT',
  PUBLIC_MODEL_RECORD: 'PUBLIC_RECORD_UNCONFIRMED',
  MANAGED_NOT_AUTO_CHARTER: 'MANAGED_NOT_CHARTER',
  NEEDS_OPERATOR_CONFIRMATION: 'NEEDS_OPERATOR_CONFIRMATION',
};

const MANUFACTURERS = ['Airbus', 'Boeing', 'Bombardier', 'Gulfstream', 'Dassault', 'Embraer', 'Cessna', 'Beechcraft', 'Leonardo', 'Bell', 'Sikorsky'];

/** Canonical field → [column in Verified/Full "Operators", column in legacy "11_Operators", group, conflict-tracked] */
const OPERATOR_FIELDS: [string, string | null, string | null, FieldGroup, boolean][] = [
  ['name', 'Operator', 'Operator', 'profile', true],
  ['gcaa_approval', 'GCAA Approval', 'GCAA Approval', 'regulatory', true],
  ['category', 'ThePrivate Category', 'Category', 'profile', true],
  ['base', 'UAE Base', 'UAE Base', 'profile', true],
  ['charter_relevance', 'Charter Relevance', null, 'research', true],
  ['charter_confirmed', null, 'Charter Confirmed', 'research', false],
  ['website', 'Website', 'Website', 'profile', true],
  ['email', 'Primary Email', 'Email', 'contact', true],
  ['phone', 'Primary Phone', 'Phone', 'contact', true],
  ['notes', 'Enrichment Notes', null, 'research', false],
  ['confidence', 'Confidence', null, 'research', true],
];

export function operatorKeyUae(id: string): string {
  return `UAE-TP:${id}`;
}

export function reconcileUae(src: SourceSet, b: PlanBuilder): void {
  const plan = b.plan;
  const verifiedOps = src.sheet(VERIFIED, 'Operators').rows;
  const fullOps = src.sheet(FULL, 'Operators').rows;
  const legacyOps = src.sheet(LEGACY, '11_Operators').rows;

  // Map legacy rows (no ID column) to IDs by approval number, falling back to exact normalised name.
  const idByApproval = new Map<string, string>();
  const idByName = new Map<string, string>();
  for (const r of verifiedOps) {
    const id = cell(r, 'ID');
    if (!id) continue;
    const appr = normalizeGcaaApproval(cell(r, 'GCAA Approval')).value;
    if (appr) idByApproval.set(appr, id);
    idByName.set(orgMatchKey(cell(r, 'Operator') ?? ''), id);
  }
  const legacyById = new Map<string, CellRow>();
  for (const r of legacyOps) {
    const id = idByApproval.get(normalizeGcaaApproval(cell(r, 'GCAA Approval')).value ?? '') ?? idByName.get(orgMatchKey(cell(r, 'Operator') ?? ''));
    if (!id) {
      plan.warnings.push(`${LEGACY}/11_Operators row ${r.ref.row}: "${cell(r, 'Operator')}" could not be linked to a verified operator.`);
      continue;
    }
    legacyById.set(id, r);
  }

  // GCAA registry rows
  const registry = src.sheet(GCAA, 'Approved UAE Air Operators').rows;
  const registryByApproval = new Map<string, CellRow>();
  for (const r of registry) {
    const appr = normalizeGcaaApproval(cell(r, 'approvalNumber'));
    if (!appr.value) {
      plan.rejected.push({ ref: r.ref, reason: `GCAA row without a readable approval number: ${appr.raw}` });
      continue;
    }
    if (registryByApproval.has(appr.value)) plan.warnings.push(`GCAA list contains approval ${appr.value} more than once.`);
    registryByApproval.set(appr.value, r);
  }

  for (const vrow of verifiedOps) {
    const id = cell(vrow, 'ID');
    if (!id) {
      plan.rejected.push({ ref: vrow.ref, reason: 'UAE operator row without ID' });
      continue;
    }
    const key = operatorKeyUae(id);
    const frow = fullOps.find((r) => cell(r, 'ID') === id) ?? null;
    const lrow = legacyById.get(id) ?? null;
    const layers: { code: string; row: CellRow; legacy: boolean }[] = [
      { code: VERIFIED, row: vrow, legacy: false },
      ...(frow ? [{ code: FULL, row: frow, legacy: false }] : []),
      ...(lrow ? [{ code: LEGACY, row: lrow, legacy: true }] : []),
    ];

    const resolved: Record<string, string | null> = {};
    const refOf: Record<string, SourceRef | null> = {};
    const observations: Observation[] = [];
    for (const [field, col, legacyCol, group, tracked] of OPERATOR_FIELDS) {
      const values: LayeredValue[] = [];
      for (const l of layers) {
        const column = l.legacy ? legacyCol : col;
        if (!column) continue;
        let value = cell(l.row, column);
        if (field === 'email' && value && parseEmails(value).obfuscated) {
          plan.repairs.push({ ref: l.row.ref, field: column, from: value, to: null, reason: 'Scraped e-mail obfuscation placeholder discarded (not an address)' });
          value = null;
        }
        values.push({ value, ref: l.row.ref, trust: src.trust(l.code, group) });
      }
      const r = resolveLayered(key, 'OPERATOR', field, values, { trackConflict: tracked });
      resolved[field] = r.value;
      refOf[field] = r.ref;
      if (r.conflict) plan.conflicts.push(r.conflict);
      const seen = new Set<string>();
      for (const v of values.filter((x) => x.value !== null).sort((a, z) => z.trust - a.trust)) {
        const c = comparable(v.value)!;
        if (seen.has(c)) continue;
        seen.add(c);
        observations.push(observation(field, v.value, v.ref, group, 'RESEARCH'));
      }
    }

    const flags: string[] = [];
    const approval = normalizeGcaaApproval((resolved['gcaa_approval'] ?? null));
    const reg = approval.value ? registryByApproval.get(approval.value) : undefined;
    if (!reg) flags.push('NOT_FOUND_IN_GCAA_LIST');
    const legalName = resolved['name'] ?? id;
    const aliases = new Set<string>();
    for (const l of layers) {
      const n = cell(l.row, 'Operator');
      if (n && n !== legalName) aliases.add(n);
    }
    if (reg) {
      const gName = cell(reg, 'organization')!;
      if (gName !== legalName) aliases.add(gName);
      if (nameSimilarity(gName, legalName) < 0.6) plan.warnings.push(`${key}: GCAA name "${gName}" differs markedly from "${legalName}" (linked by approval ${approval.value}).`);
    }
    const issue = reg ? parseGcaaDate(cell(reg, 'issueDate')) : null;
    const expiry = reg ? parseGcaaDate(cell(reg, 'expiryDate')) : null;
    const website = normalizeUrl((resolved['website'] ?? null));

    const op: PlannedOperator = {
      key,
      country: 'AE',
      legalName,
      displayName: legalName,
      aliases: [...aliases].sort(),
      slugBase: slugify(legalName),
      website: website.value,
      linkedinUrl: null,
      instagramHandle: null,
      address: null,
      baseDescription: (resolved['base'] ?? null),
      marketplaceRelevance: (resolved['charter_relevance'] ?? null),
      charterActivity: (resolved['category'] ?? null),
      operatorKind: (resolved['category'] ?? null),
      fleetClassesRaw: null,
      authorizations: [
        {
          authority: 'GCAA',
          certificateType: 'AOC',
          numberRaw: reg ? cell(reg, 'approvalNumber') : approval.raw,
          numberNormalized: approval.value,
          numberStatus: approval.value ? 'VALID' : approval.raw ? 'MALFORMED' : 'MISSING',
          validFrom: issue?.value ?? null,
          validUntil: expiry?.value ?? null,
          validUntilRaw: expiry?.raw ?? null,
          scope: null,
          scopeRaw: null,
          ref: reg?.ref ?? refOf['gcaa_approval'] ?? vrow.ref,
        },
      ],
      contacts: buildUaeContacts(src, b, key, id, resolved, refOf, layers),
      dataQualityFlags: flags,
      observations,
      refs: [...layers.map((l) => l.row.ref), ...(reg ? [reg.ref] : [])],
    };
    plan.operators.push(op);
  }

  // Registry entries for every GCAA organisation (linked where it is one of our operators).
  const opByApproval = new Map(plan.operators.filter((o) => o.country === 'AE').map((o) => [o.authorizations[0]?.numberNormalized ?? '', o.key]));
  for (const r of registry) {
    const appr = normalizeGcaaApproval(cell(r, 'approvalNumber'));
    if (!appr.value) continue;
    plan.registryEntries.push({
      key: `GCAA:${appr.value}`,
      authority: 'GCAA',
      organizationName: cell(r, 'organization') ?? '',
      approvalNumberRaw: appr.raw ?? '',
      approvalNumber: appr.value,
      organizationType: cell(r, 'organizationType'),
      issueDate: parseGcaaDate(cell(r, 'issueDate')).value,
      expiryDate: parseGcaaDate(cell(r, 'expiryDate')).value,
      country: cell(r, 'country'),
      linkedOperatorKey: opByApproval.get(appr.value) ?? null,
      ref: r.ref,
    });
  }

  reconcileUaeAircraft(src, b, idByName);
  reconcileUaeSources(src, b);
  checkUaeMetadata(src, b);
}

function buildUaeContacts(
  src: SourceSet,
  b: PlanBuilder,
  key: string,
  id: string,
  resolved: Record<string, string | null>,
  refOf: Record<string, SourceRef | null>,
  layers: { code: string; row: CellRow; legacy: boolean }[],
): PlannedContact[] {
  const contacts: PlannedContact[] = [];
  const emails = parseEmails((resolved['email'] ?? null));
  const phones = parsePhones((resolved['phone'] ?? null), 'AE');
  contacts.push({
    key: `${key}:company`,
    kind: 'COMPANY',
    name: null,
    title: null,
    emails: emails.emails,
    phones: phones.phones,
    unparsedPhones: phones.unparsed,
    sourceUrl: null,
    note: 'Primary company contact from the UAE verification pass.',
    confidence: 'VERIFIED_PUBLIC',
    refs: [refOf['email'], refOf['phone']].filter((r): r is SourceRef => Boolean(r)),
  });

  // Numbers/addresses that appear only in an older layer are kept separately, marked unverified.
  const legacy = layers.find((l) => l.legacy);
  if (legacy) {
    const lp = parsePhones(cell(legacy.row, 'Phone'), 'AE').phones.filter((p) => !phones.phones.includes(p));
    const le = parseEmails(cell(legacy.row, 'Email')).emails.filter((e) => !emails.emails.includes(e));
    if (lp.length || le.length) {
      contacts.push({
        key: `${key}:company-legacy`,
        kind: 'COMPANY',
        name: null,
        title: null,
        emails: le,
        phones: lp,
        unparsedPhones: [],
        sourceUrl: null,
        note: `Present only in the oldest enrichment layer (${LEGACY}); not repeated in later passes. Verify before use.`,
        confidence: 'UNVERIFIED',
        refs: [legacy.row.ref],
      });
    }
  }

  // Outreach contacts: Verified is primary; Full is a layer aligned by (operator, contact name/role).
  const v = src.sheet(VERIFIED, 'Outreach_Contacts').rows.filter((r) => cell(r, 'Operator ID') === id);
  const f = src.sheet(FULL, 'Outreach_Contacts').rows.filter((r) => cell(r, 'Operator ID') === id);
  const align = (r: CellRow) => `${cell(r, 'Public Contact') ?? ''}|${cell(r, 'Contact Role') ?? ''}`;
  v.forEach((row, idx) => {
    const ckey = `${key}:outreach:${idx + 1}`;
    const match = f.find((x) => align(x) === align(row));
    for (const col of ['Public Contact', 'Title', 'Email', 'Phone', 'Source URL']) {
      const values: LayeredValue[] = [{ value: cell(row, col), ref: row.ref, trust: src.trust(VERIFIED, 'contact') }];
      if (match) values.push({ value: cell(match, col), ref: match.ref, trust: src.trust(FULL, 'contact') });
      const r = resolveLayered(ckey, 'CONTACT', col, values, { trackConflict: true });
      if (r.conflict) b.plan.conflicts.push(r.conflict);
    }
    const person = cell(row, 'Public Contact');
    const role = cell(row, 'Contact Role') ?? '';
    const p = parsePhones(cell(row, 'Phone'), 'AE');
    contacts.push({
      key: ckey,
      kind: person ? 'DECISION_MAKER' : /charter/i.test(role) ? 'CHARTER_SALES' : 'COMPANY',
      name: person,
      title: cell(row, 'Title'),
      emails: parseEmails(cell(row, 'Email')).emails,
      phones: p.phones,
      unparsedPhones: p.unparsed,
      sourceUrl: normalizeUrl(cell(row, 'Source URL')).value,
      note: [role && `Role: ${role}`, cell(row, 'Source Type') && `Source: ${cell(row, 'Source Type')}`, cell(row, 'Outreach Note')].filter(Boolean).join(' · ') || null,
      confidence: 'VERIFIED_PUBLIC',
      refs: [row.ref, ...(match ? [match.ref] : [])],
    });
  });
  return contacts;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** Extracts an explicitly stated count from a note ("reports 4 aircraft", "offers 3 Q400 aircraft"). */
function statedCount(note: string | null): number | null {
  if (!note) return null;
  const m = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[A-Z0-9-]+\s+)?aircraft\b/i.exec(note);
  if (!m) return null;
  const w = m[1]!.toLowerCase();
  return NUMBER_WORDS[w] ?? Number(w);
}

function reconcileUaeAircraft(src: SourceSet, b: PlanBuilder, idByName: Map<string, string>) {
  const plan = b.plan;
  const vrows = src.sheet(VERIFIED, 'Aircraft_Verified').rows;
  const frows = src.sheet(FULL, 'Aircraft').rows;
  const lrows = src.sheet(LEGACY, 'Aircraft_Enrichment').rows;

  const identity = (opId: string, type: string | null, reg: string | null, occurrence: number) =>
    reg ? `REG:${reg}` : `FLEET:${opId}:${modelKey(type ?? 'unknown').toLowerCase()}${occurrence > 1 ? `:${occurrence}` : ''}`;

  const keyed = (rows: CellRow[], opIdOf: (r: CellRow) => string | null) => {
    const seen = new Map<string, number>();
    const out = new Map<string, CellRow>();
    for (const r of rows) {
      const opId = opIdOf(r);
      if (!opId) continue;
      const reg = normalizeRegistration(cell(r, 'Registration')).value;
      const base = identity(opId, cell(r, 'Aircraft Type'), reg, 1);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      out.set(identity(opId, cell(r, 'Aircraft Type'), reg, n), r);
    }
    return out;
  };
  const verifiedByKey = keyed(vrows, (r) => cell(r, 'Operator ID'));
  const fullByKey = alignLayer(verifiedByKey, keyed(frows, (r) => cell(r, 'Operator ID')));
  const legacyByKey = alignLayer(verifiedByKey, keyed(lrows, (r) => idByName.get(orgMatchKey(cell(r, 'Operator') ?? '')) ?? null));

  for (const [ikey, row] of verifiedByKey) {
    const opId = cell(row, 'Operator ID')!;
    const operatorKey = operatorKeyUae(opId);
    let status = cell(row, 'Verification Status');
    let note = cell(row, 'Verification Note');
    // Repair: five rows have Verification Status and Verification Note swapped.
    if (status && !STATUSES.includes(status as SourceStatus) && note && STATUSES.includes(note as SourceStatus)) {
      plan.repairs.push({ ref: row.ref, field: 'Verification Status', from: status, to: note, reason: 'Status and note columns were swapped in the source row' });
      [status, note] = [note, status];
    }
    const knownStatus = status && STATUSES.includes(status as SourceStatus) ? (status as SourceStatus) : null;
    const flags: string[] = [];
    if (!knownStatus) flags.push(`UNRECOGNISED_SOURCE_STATUS:${status ?? 'blank'}`);

    const typeRaw = cell(row, 'Aircraft Type');
    const typeMatch = b.resolveType(typeRaw);
    const regParse = normalizeRegistration(cell(row, 'Registration'));
    const seats = parseInteger(row.cells['Seats']);
    const fullRow = fullByKey.get(ikey) ?? null;
    const legacyRow = legacyByKey.get(ikey) ?? null;

    // Layer comparison for factual fields; narrative notes are observations only.
    const obs: Observation[] = [];
    for (const [col, tracked] of [['Seats', true], ['Aircraft Type', true], ['Availability / Use', false], ['Source URL', false], ['Verification Note', false]] as const) {
      const values: LayeredValue[] = [{ value: col === 'Verification Note' ? note : cell(row, col), ref: row.ref, trust: src.trust(VERIFIED, 'research') }];
      if (fullRow) values.push({ value: cell(fullRow, col), ref: fullRow.ref, trust: src.trust(FULL, 'research') });
      if (legacyRow) {
        const lcol = col === 'Availability / Use' ? 'Availability' : col === 'Source URL' ? 'Source' : col;
        if (lcol in legacyRow.cells) values.push({ value: cell(legacyRow, lcol), ref: legacyRow.ref, trust: src.trust(LEGACY, 'research') });
      }
      const r = resolveLayered(ikey, regParse.value ? 'AIRCRAFT' : 'FLEET_EVIDENCE', col, values, { trackConflict: tracked });
      if (r.conflict) plan.conflicts.push(r.conflict);
      const seen = new Set<string>();
      for (const v of values.filter((x) => x.value !== null)) {
        const c = comparable(v.value)!;
        if (seen.has(c)) continue;
        seen.add(c);
        obs.push(observation(col, v.value, v.ref, 'research', 'VERIFIED_PUBLIC'));
      }
    }

    // Internal consistency: the note names a different manufacturer than the type column.
    let typeResolution: PlannedAircraft['typeResolution'] = typeMatch.kind;
    if (typeRaw && note) {
      const typeMaker = MANUFACTURERS.find((m) => new RegExp(`\\b${m}\\b`, 'i').test(typeRaw));
      const noteMakers = MANUFACTURERS.filter((m) => new RegExp(`\\b${m}\\b`, 'i').test(note!));
      if (typeMaker && noteMakers.length && !noteMakers.includes(typeMaker)) {
        typeResolution = 'CONFLICT';
        flags.push('TYPE_CONTRADICTED_BY_SOURCE_NOTE');
        plan.conflicts.push({
          entityKey: ikey,
          entityType: regParse.value ? 'AIRCRAFT' : 'FLEET_EVIDENCE',
          field: 'aircraftType',
          values: [
            { value: typeRaw, ref: row.ref, trust: src.trust(VERIFIED, 'research') },
            { value: note, ref: row.ref, trust: src.trust(VERIFIED, 'research') },
          ],
          resolution: 'OPEN',
          chosen: null,
          reason: `Type column says ${typeMaker} but the verification note refers to ${noteMakers.join('/')}.`,
        });
      }
    }

    if (regParse.value) {
      if (regParse.status === 'REPAIRED') plan.repairs.push({ ref: row.ref, field: 'Registration', from: regParse.raw, to: regParse.value, reason: 'Registration normalised' });
      if (typeMatch.kind === 'AMBIGUOUS') flags.push('TYPE_VARIANT_AMBIGUOUS');
      if (typeMatch.kind === 'UNMATCHED') flags.push('TYPE_UNMATCHED');
      plan.aircraft.push({
        key: ikey,
        registration: regParse.value,
        operatorKey,
        modelRaw: typeRaw,
        typeKey: typeResolution === 'MATCHED' && typeMatch.kind === 'MATCHED' ? typeMatch.type.key : null,
        typeResolution,
        typeFamilyHint: typeMatch.kind === 'AMBIGUOUS' ? typeMatch.family : null,
        airframeClass: typeMatch.kind === 'MATCHED' ? typeMatch.type.airframeClass : null,
        seats: seats.value,
        seatsRaw: seats.raw,
        isCargo: false,
        isAerialWork: false,
        evidenceLevel: knownStatus ? AIRCRAFT_EVIDENCE[knownStatus] : 'NEEDS_OPERATOR_CONFIRMATION',
        sourceStatusRaw: status,
        usageRaw: cell(row, 'Availability / Use'),
        sourceUrl: normalizeUrl(cell(row, 'Source URL')).value,
        note,
        attributionUncertain: false,
        dataQualityFlags: flags,
        observations: obs,
        refs: [row.ref, ...(fullRow ? [fullRow.ref] : []), ...(legacyRow ? [legacyRow.ref] : [])],
      });
    } else {
      if (regParse.status === 'MALFORMED') plan.warnings.push(`${VERIFIED} row ${row.ref.row}: unreadable registration "${regParse.raw}" – kept as model-level evidence.`);
      const fe: PlannedFleetEvidence = {
        key: ikey,
        operatorKey,
        modelRaw: typeRaw ?? 'Unspecified',
        typeKey: typeMatch.kind === 'MATCHED' ? typeMatch.type.key : null,
        typeResolution: typeMatch.kind,
        seats: seats.value,
        reportedCount: statedCount(note),
        usageRaw: cell(row, 'Availability / Use'),
        evidenceLevel: knownStatus === 'PUBLIC_MODEL_RECORD' ? 'PUBLIC_MODEL_RECORD' : knownStatus ? AIRCRAFT_EVIDENCE[knownStatus] : 'NEEDS_OPERATOR_CONFIRMATION',
        sourceStatusRaw: status,
        sourceUrl: normalizeUrl(cell(row, 'Source URL')).value,
        sourceType: cell(row, 'Source Type'),
        note,
        refs: [row.ref, ...(fullRow ? [fullRow.ref] : []), ...(legacyRow ? [legacyRow.ref] : [])],
      };
      plan.fleetEvidence.push(fe);
    }
  }

  for (const [k, r] of legacyByKey) {
    if (!verifiedByKey.has(k)) plan.warnings.push(`${LEGACY}/Aircraft_Enrichment row ${r.ref.row} (${cell(r, 'Operator')} · ${cell(r, 'Aircraft Type')}) is absent from the verification pass; not imported.`);
  }
  for (const [k, r] of fullByKey) {
    if (!verifiedByKey.has(k)) plan.warnings.push(`${FULL}/Aircraft row ${r.ref.row} is absent from the verification pass; not imported.`);
  }
}

/**
 * Aligns an older layer's rows to the verified rows. Exact identity first; then, for
 * model-level rows whose wording changed between passes ("Agusta AW169" → "AgustaWestland AW169"),
 * by resolved catalogue type within the same operator, only when the pairing is unique on both sides.
 * Unaligned rows keep their own key so they are reported as absent from the verification pass.
 */
function alignLayer(verified: Map<string, CellRow>, layer: Map<string, CellRow>): Map<string, CellRow> {
  const out = new Map<string, CellRow>();
  const pendingLayer = new Map<string, CellRow>();
  for (const [k, r] of layer) (verified.has(k) ? out : pendingLayer).set(k, r);
  const typeIdentity = (key: string, r: CellRow) => {
    const op = key.split(':')[1];
    const m = matchAircraftType(cell(r, 'Aircraft Type'));
    const t = m.kind === 'MATCHED' ? m.type.key : m.kind === 'AMBIGUOUS' ? `family:${m.family}` : null;
    return op && t ? `${op}|${t}` : null;
  };
  const group = (entries: [string, CellRow][]) => {
    const g = new Map<string, string[]>();
    for (const [k, r] of entries) {
      if (k.startsWith('REG:')) continue;
      const id = typeIdentity(k, r);
      if (id) g.set(id, [...(g.get(id) ?? []), k]);
    }
    return g;
  };
  const unmatchedVerified = group([...verified].filter(([k]) => !out.has(k)));
  const layerGroups = group([...pendingLayer]);
  for (const [id, vKeys] of unmatchedVerified) {
    const lKeys = layerGroups.get(id);
    if (vKeys.length === 1 && lKeys?.length === 1) {
      out.set(vKeys[0]!, pendingLayer.get(lKeys[0]!)!);
      pendingLayer.delete(lKeys[0]!);
    }
  }
  for (const [k, r] of pendingLayer) out.set(k, r);
  return out;
}

function reconcileUaeSources(src: SourceSet, b: PlanBuilder) {
  const seen = new Set<string>();
  for (const code of [VERIFIED, FULL]) {
    for (const row of src.sheet(code, 'Sources').rows) {
      const id = cell(row, 'Source ID') ?? `row${row.ref.row}`;
      const key = `AE:${id}:${slugify(cell(row, 'Dataset / Page') ?? '')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      b.plan.evidenceSources.push({
        key,
        label: cell(row, 'Dataset / Page') ?? id,
        organization: cell(row, 'Organization'),
        sourceType: cell(row, 'Source Type'),
        asOf: cell(row, 'Date / Status'),
        url: normalizeUrl(cell(row, 'URL')).value,
        usage: cell(row, 'Use'),
        ref: row.ref,
      });
    }
  }
  const meta = src.sheet(GCAA, 'Metadata').rows;
  const get = (label: RegExp) => meta.find((r) => label.test(cell(r, 'field') ?? ''));
  const updated = get(/^Last Update Date/);
  const url = get(/^Source \(URL/);
  if (updated) {
    b.plan.evidenceSources.push({
      key: 'GCAA:approved-uae-air-operators',
      label: 'Approved UAE Air Operators (GCAA open data)',
      organization: 'UAE General Civil Aviation Authority',
      sourceType: 'Official regulator dataset',
      asOf: cell(updated, 'value'),
      url: normalizeUrl(/https?:\/\/[^\s)]+/.exec(cell(url!, 'value') ?? '')?.[0]).value,
      usage: 'Approval numbers and validity dates for UAE operators. Not evidence of charter inventory.',
      ref: updated.ref,
    });
  }
}

function checkUaeMetadata(src: SourceSet, b: PlanBuilder) {
  const plan = b.plan;
  const vrows = src.sheet(VERIFIED, 'Aircraft_Verified').rows;
  const repairedStatus = (r: CellRow) => {
    const s = cell(r, 'Verification Status');
    const n = cell(r, 'Verification Note');
    return s && STATUSES.includes(s as SourceStatus) ? s : n && STATUSES.includes(n as SourceStatus) ? n : s;
  };
  const byStatus = (s: string) => vrows.filter((r) => repairedStatus(r) === s).length;
  const fullAircraft = src.sheet(FULL, 'Aircraft').rows;
  const fullOps = src.sheet(FULL, 'Operators').rows;
  const fullContacts = src.sheet(FULL, 'Outreach_Contacts').rows;
  const checks: Record<string, Record<string, () => number>> = {
    [`${VERIFIED}|Verification_Summary`]: {
      'Operators in scope': () => src.sheet(VERIFIED, 'Operators').rows.length,
      'Aircraft/model records after verification pass': () => vrows.length,
      'Current/publicly verified records': () => byStatus('CURRENT_PUBLIC'),
      'Recent operationally observed records': () => byStatus('RECENT_TRACKED'),
      'Managed / not automatically charter': () => byStatus('MANAGED_NOT_AUTO_CHARTER'),
      'Needs operator confirmation': () => byStatus('NEEDS_OPERATOR_CONFIRMATION'),
      'Still only public model record': () => byStatus('PUBLIC_MODEL_RECORD'),
    },
    [`${FULL}|QA_Metrics`]: {
      'Selected UAE operators': () => fullOps.length,
      'Operators with official website/contact': () => fullOps.filter((r) => cell(r, 'Website') || cell(r, 'Primary Email')).length,
      'Aircraft evidence rows': () => fullAircraft.length,
      'Aircraft rows with registration': () => fullAircraft.filter((r) => cell(r, 'Registration')).length,
      'Aircraft rows with seats': () => fullAircraft.filter((r) => clean(r.cells['Seats']) !== null).length,
      'Named public decision-makers / key contacts': () => fullContacts.filter((r) => cell(r, 'Public Contact')).length,
      'High-confidence operator records': () => fullOps.filter((r) => cell(r, 'Confidence') === 'High').length,
    },
  };
  for (const [k, metrics] of Object.entries(checks)) {
    const [code, sheet] = k.split('|') as [string, string];
    for (const row of src.sheet(code, sheet).rows) {
      const label = cell(row, 'Metric');
      const stated = cell(row, 'Count') ?? cell(row, 'Value');
      if (!label || stated === null) continue;
      const fn = metrics[label];
      if (!fn) {
        plan.metadataChecks.push({ ref: row.ref, claim: label, stated, computed: 'not machine-checkable', consistent: true });
        continue;
      }
      const c = fn();
      plan.metadataChecks.push({ ref: row.ref, claim: label, stated, computed: String(c), consistent: Number(stated) === c });
    }
  }
}
