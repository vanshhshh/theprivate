/**
 * India reconciliation.
 *
 * All seven India workbooks describe the SAME 138 DGCA NSOP rows (shared operator_master_id)
 * and the SAME 491-row aircraft sheet. They are layers, not separate universes:
 *   Final Web Pass (primary) > Outreach CRM / Contacts (contact layers) > Deep > Web > Enriched > May (historical).
 * Each field is resolved from the highest-trust layer for its field group; disagreements on
 * decision-relevant fields become conflict records, and every distinct value is kept as an observation.
 */
import {
  clean,
  looksInterleaved,
  normalizeDgcaPermitNumber,
  normalizeRegistration,
  normalizeUrl,
  orgMatchKey,
  parseAirframeClass,
  parseDottedDate,
  parseEmails,
  parseInteger,
  parseOperatingScope,
  parsePhones,
  parseSeats,
  slugify,
} from './normalize';
import { cell, comparable, observation, resolveLayered, type LayeredValue, type PlanBuilder, type SourceSet } from './shared';
import type { CellRow, FieldGroup, Observation, PlannedAircraft, PlannedContact, PlannedOperator, SourceRef } from './types';

const OPERATOR_LAYERS = [
  { code: 'IN_FINAL_WEB_PASS', sheet: 'Operators Enriched' },
  { code: 'IN_OUTREACH_CRM', sheet: 'Operators Enriched' },
  { code: 'IN_OUTREACH_CRM', sheet: 'Operator Contacts' },
  { code: 'IN_CONTACTS', sheet: 'Operators Enriched' },
  { code: 'IN_CONTACTS', sheet: 'Operator Contacts' },
  { code: 'IN_DEEP_ENRICHED', sheet: 'Operators Enriched' },
  { code: 'IN_WEB_ENRICHED', sheet: 'Operators Enriched' },
  { code: 'IN_ENRICHED', sheet: 'Operators Enriched' },
  { code: 'IN_MAY_MASTER', sheet: 'Operators' },
] as const;

const AIRCRAFT_LAYERS = ['IN_FINAL_WEB_PASS', 'IN_OUTREACH_CRM', 'IN_CONTACTS', 'IN_DEEP_ENRICHED', 'IN_WEB_ENRICHED', 'IN_ENRICHED', 'IN_MAY_MASTER'] as const;

const FIELD_GROUP: Record<string, FieldGroup> = {
  source_row: 'regulatory', dgca_listed_no: 'regulatory', operator_name_raw: 'regulatory', contact_details: 'regulatory',
  aop_no: 'regulatory', valid_upto: 'regulatory', aircraft_count_dgca: 'regulatory', domestic_international: 'regulatory',
  fleet: 'regulatory', primary_aircraft_type: 'regulatory', source_page: 'regulatory', source: 'regulatory',
  communication_address: 'regulatory', source_data_quality: 'regulatory',
  operator_name: 'profile', website: 'profile', instagram: 'profile', linkedin: 'profile', operator_type: 'profile', charter_business: 'profile',
  private_jet_relevance: 'research', priority: 'research', estimated_activity: 'research', revenue_fy25: 'research', notes: 'research',
  web_research_date: 'research', web_research_confidence: 'research', research_status: 'research', research_next_step: 'research',
  international_capability: 'research', outreach_status: 'research',
  decision_maker: 'contact', decision_maker_title: 'contact', decision_maker_contact: 'contact', dgca_phone: 'contact', dgca_email: 'contact',
  current_phone: 'contact', current_email: 'contact', contact_source: 'contact', best_phone: 'contact', best_email: 'contact',
  decision_maker_source: 'contact', decision_maker_status: 'contact', contact_status: 'contact', needs_manual_verification: 'contact',
};

/** Decision-relevant fields: disagreement between layers is recorded as a conflict. Narrative fields are observations only. */
const CONFLICT_TRACKED = new Set([
  'operator_name', 'aop_no', 'valid_upto', 'domestic_international', 'aircraft_count_dgca', 'website', 'instagram', 'linkedin',
  'operator_type', 'charter_business', 'priority', 'private_jet_relevance', 'revenue_fy25', 'decision_maker', 'decision_maker_title',
  'decision_maker_contact', 'best_phone', 'best_email', 'dgca_phone', 'dgca_email', 'current_phone', 'current_email',
]);

const IGNORED_FIELDS = new Set(['operator_master_id']);

function masterId(row: CellRow): number | null {
  return parseInteger(row.cells['operator_master_id']).value;
}

export function operatorKeyIndia(id: number): string {
  return `IN-NSOP-MASTER:${id}`;
}

export function reconcileIndia(src: SourceSet, b: PlanBuilder): void {
  const plan = b.plan;
  const primary = src.sheet('IN_FINAL_WEB_PASS', 'Operators Enriched');

  // ---- Index every layer by operator_master_id ------------------------------------------------
  const layerRows = new Map<number, { code: string; row: CellRow }[]>();
  const primaryIds = new Set<number>();
  for (const layer of OPERATOR_LAYERS) {
    const sheet = src.sheet(layer.code, layer.sheet);
    const ids = new Set<number>();
    for (const row of sheet.rows) {
      const id = masterId(row);
      if (id === null) {
        plan.rejected.push({ ref: row.ref, reason: 'Missing or non-numeric operator_master_id' });
        continue;
      }
      ids.add(id);
      if (layer.code === 'IN_FINAL_WEB_PASS') primaryIds.add(id);
      layerRows.set(id, [...(layerRows.get(id) ?? []), { code: layer.code, row }]);
    }
    if (layer.code !== 'IN_FINAL_WEB_PASS') {
      const missing = [...primaryIds].filter((i) => !ids.has(i));
      const extra = [...ids].filter((i) => !primaryIds.has(i));
      if (missing.length || extra.length) {
        plan.warnings.push(`${layer.code}/${layer.sheet}: ${missing.length} ids missing vs primary, ${extra.length} extra ids (${extra.slice(0, 5).join(', ')})`);
      }
    }
  }

  // ---- Aircraft rows: verify layers are identical, then use the primary --------------------------
  const aircraftSheet = src.sheet('IN_FINAL_WEB_PASS', 'Aircraft');
  const signature = (rows: CellRow[]) => rows.map((r) => JSON.stringify(Object.values(r.cells).map((v) => clean(v)))).join('\n');
  const primarySig = signature(aircraftSheet.rows);
  for (const code of AIRCRAFT_LAYERS.slice(1)) {
    if (signature(src.sheet(code, 'Aircraft').rows) !== primarySig) {
      plan.warnings.push(`${code}/Aircraft differs from the primary Aircraft sheet; only the primary sheet is imported. Review the differences manually.`);
    }
  }
  const aircraftByOperator = new Map<number, CellRow[]>();
  for (const row of aircraftSheet.rows) {
    const id = masterId(row);
    if (id === null) {
      plan.rejected.push({ ref: row.ref, reason: 'Aircraft row without operator_master_id' });
      continue;
    }
    aircraftByOperator.set(id, [...(aircraftByOperator.get(id) ?? []), row]);
  }

  // ---- Operators --------------------------------------------------------------------------------
  for (const prow of primary.rows) {
    const id = masterId(prow);
    if (id === null) continue;
    const key = operatorKeyIndia(id);
    const layers = layerRows.get(id) ?? [];
    const fields = new Set<string>();
    for (const l of layers) for (const f of Object.keys(l.row.cells)) if (!IGNORED_FIELDS.has(f)) fields.add(f);

    const resolved: Record<string, string | null> = {};
    const refOf: Record<string, SourceRef | null> = {};
    const observations: Observation[] = [];
    for (const field of [...fields].sort()) {
      const group = FIELD_GROUP[field] ?? 'research';
      const values: LayeredValue[] = layers.map((l) => ({ value: cell(l.row, field), ref: l.row.ref, trust: src.trust(l.code, group) }));
      const r = resolveLayered(key, 'OPERATOR', field, values, { trackConflict: CONFLICT_TRACKED.has(field) });
      resolved[field] = r.value;
      refOf[field] = r.ref;
      if (r.conflict) plan.conflicts.push(r.conflict);
      // One observation per distinct value (highest-trust occurrence); full rows are kept as SourceRecords.
      const seen = new Set<string>();
      for (const v of values.filter((x) => x.value !== null).sort((a, z) => z.trust - a.trust)) {
        const c = comparable(v.value)!;
        if (seen.has(c)) continue;
        seen.add(c);
        observations.push(observation(field, v.value, v.ref, group, group === 'regulatory' ? 'AUTHORITY' : 'RESEARCH'));
      }
    }

    const flags: string[] = [];
    const quality = (resolved['source_data_quality'] ?? null);
    if (quality && quality !== 'DGCA extracted') flags.push(`SOURCE_NOTE:${quality}`);
    // Regulatory authorisation (DGCA NSOP permit)
    const aop = normalizeDgcaPermitNumber((resolved['aop_no'] ?? null));
    const validity = parseDottedDate((resolved['valid_upto'] ?? null));
    const scope = parseOperatingScope((resolved['domestic_international'] ?? null));

    // A DGCA row is "interleaved" when the PDF extraction zipped two operators' rows together.
    // Strongest signal: the permit number itself is two numbers interleaved ("## 1078//21092958");
    // secondary signal: the raw May-2026 name is two names zipped together.
    const mayRow = layers.find((l) => l.code === 'IN_MAY_MASTER')?.row;
    const mayName = mayRow ? cell(mayRow, 'operator_name') : null;
    const interleaved = aop.note === 'Interleaved PDF extraction artifact' || Boolean(mayName && looksInterleaved(mayName));
    if (interleaved) flags.push('SOURCE_ROW_INTERLEAVED');
    if (aop.status === 'MALFORMED') flags.push('AUTHORITY_NUMBER_MALFORMED');
    if (validity.status === 'MALFORMED') flags.push('AUTHORITY_VALIDITY_MALFORMED');
    if (scope.status === 'MALFORMED') flags.push('OPERATING_SCOPE_MALFORMED');
    if (aop.status === 'REPAIRED') plan.repairs.push({ ref: refOf['aop_no']!, field: 'aop_no', from: aop.raw, to: aop.value, reason: 'Normalised DGCA permit number format' });

    const legalName = resolved['operator_name'] ?? resolved['operator_name_raw'] ?? `Unnamed DGCA row ${id}`;
    if (/extraction artifact/i.test(legalName)) flags.push('NAME_CONTAINS_ARTIFACT_NOTE');

    // Aliases come only from curated profile layers. Raw extraction names (May master, aircraft
    // sheet) can be garbled merges of two companies and stay as observations, never aliases.
    const aliases = new Set<string>();
    for (const l of layers) {
      if (src.trust(l.code, 'profile') < 50) continue;
      const n = cell(l.row, 'operator_name');
      if (n && n !== legalName && !looksInterleaved(n)) aliases.add(n);
    }

    const website = normalizeUrl((resolved['website'] ?? null));
    if (website.status === 'MALFORMED') flags.push('WEBSITE_NOT_A_URL');
    const linkedin = normalizeUrl((resolved['linkedin'] ?? null));
    const instagram = (resolved['instagram'] ?? null);

    const contacts = buildIndiaContacts(key, resolved, refOf);

    const op: PlannedOperator = {
      key,
      country: 'IN',
      legalName,
      displayName: legalName,
      aliases: [...aliases].sort(),
      slugBase: slugify(legalName.replace(/\(.*?artifact.*?\)/i, '')),
      website: website.value,
      linkedinUrl: linkedin.status === 'OK' || linkedin.status === 'REPAIRED' ? (linkedin.value?.includes('linkedin.com') ? linkedin.value : null) : null,
      instagramHandle: instagram && /^@?[\w.]{2,30}$/.test(instagram) ? instagram.replace(/^@?/, '@') : null,
      address: (resolved['communication_address'] ?? null),
      baseDescription: null,
      marketplaceRelevance: (resolved['priority'] ?? null),
      charterActivity: (resolved['charter_business'] ?? null),
      operatorKind: (resolved['operator_type'] ?? null),
      fleetClassesRaw: (resolved['fleet'] ?? null),
      authorizations: [
        {
          authority: 'DGCA',
          certificateType: 'NSOP',
          numberRaw: aop.raw,
          numberNormalized: aop.value,
          numberStatus: aop.value ? 'VALID' : aop.raw ? 'MALFORMED' : 'MISSING',
          validFrom: null,
          validUntil: validity.value,
          validUntilRaw: validity.raw,
          scope: scope.value,
          scopeRaw: scope.raw,
          ref: refOf['aop_no'] ?? prow.ref,
        },
      ],
      contacts,
      dataQualityFlags: flags,
      observations,
      refs: layers.map((l) => l.row.ref),
    };
    plan.operators.push(op);

    // ---- Aircraft for this operator -------------------------------------------------------------
    const attributionUncertain = interleaved || aop.status === 'MALFORMED';
    let validAircraft = 0;
    for (const arow of aircraftByOperator.get(id) ?? []) {
      const planned = buildIndiaAircraft(b, arow, key, attributionUncertain);
      if (planned) {
        validAircraft += 1;
        plan.aircraft.push(planned);
      }
    }
    const statedCount = parseInteger((resolved['aircraft_count_dgca'] ?? null));
    if (statedCount.value !== null && statedCount.value !== validAircraft) {
      op.dataQualityFlags.push(`DGCA_AIRCRAFT_COUNT_MISMATCH:stated=${statedCount.value},rows=${validAircraft}`);
    }
  }

  // ---- Duplicate registrations across operators -------------------------------------------------
  const byReg = new Map<string, PlannedAircraft[]>();
  for (const a of plan.aircraft) byReg.set(a.registration, [...(byReg.get(a.registration) ?? []), a]);
  for (const [reg, list] of byReg) {
    if (list.length < 2) continue;
    const [first, ...rest] = list;
    plan.conflicts.push({
      entityKey: `REG:${reg}`,
      entityType: 'AIRCRAFT',
      field: 'operator',
      values: list.map((a) => ({ value: a.operatorKey, ref: a.refs[0]!, trust: 100 })),
      resolution: 'OPEN',
      chosen: null,
      reason: 'Same registration listed under more than one operator.',
    });
    first!.dataQualityFlags.push('REGISTRATION_LISTED_UNDER_MULTIPLE_OPERATORS');
    first!.attributionUncertain = true;
    for (const dup of rest) {
      plan.aircraft.splice(plan.aircraft.indexOf(dup), 1);
      first!.refs.push(...dup.refs);
    }
  }

  reconcileIndiaResearchSheets(src, b);
  checkIndiaMetadata(src, b);
}

function buildIndiaContacts(key: string, r: Record<string, string | null>, refOf: Record<string, SourceRef | null>): PlannedContact[] {
  const contacts: PlannedContact[] = [];
  const needsManual = r['needs_manual_verification'] === 'true';
  const refs = (...fields: string[]) => [...new Map(fields.map((f) => refOf[f]).filter((x): x is SourceRef => Boolean(x)).map((x) => [`${x.source}|${x.sheet}|${x.row}`, x])).values()];

  // Regulatory contact as published in the DGCA list.
  const dgcaPhones = parsePhones(r['dgca_phone'] ?? r['contact_details'], 'IN');
  const dgcaEmails = parseEmails(r['dgca_email'] ?? r['contact_details']);
  if (dgcaPhones.phones.length || dgcaEmails.emails.length || dgcaPhones.unparsed.length) {
    contacts.push({
      key: `${key}:regulatory`,
      kind: 'REGULATORY',
      name: null,
      title: null,
      emails: dgcaEmails.emails,
      phones: dgcaPhones.phones,
      unparsedPhones: dgcaPhones.unparsed,
      sourceUrl: null,
      note: 'Published in the DGCA NSOP list: a regulatory contact, not necessarily the commercial decision-maker.',
      confidence: needsManual ? 'UNVERIFIED' : 'AUTHORITY',
      refs: refs('dgca_phone', 'dgca_email', 'contact_details'),
    });
  }

  // Current company contact found by research (only when it differs from the regulatory one).
  const curPhones = parsePhones(r['current_phone'], 'IN');
  const curEmails = parseEmails(r['current_email']);
  if (curPhones.phones.length || curEmails.emails.length) {
    contacts.push({
      key: `${key}:company`,
      kind: 'COMPANY',
      name: null,
      title: null,
      emails: curEmails.emails,
      phones: curPhones.phones,
      unparsedPhones: curPhones.unparsed,
      sourceUrl: null,
      note: r['contact_source'] ? `Source: ${r['contact_source']}` : null,
      confidence: needsManual ? 'UNVERIFIED' : 'RESEARCH',
      refs: refs('current_phone', 'current_email', 'contact_source'),
    });
  }

  const dm = r['decision_maker'];
  if (dm) {
    const dmPhones = parsePhones(r['decision_maker_contact'], 'IN');
    const dmEmails = parseEmails(r['decision_maker_contact']);
    const notes = [r['decision_maker_source'] && `Source: ${r['decision_maker_source']}`, r['decision_maker_status'] && `Status: ${r['decision_maker_status']}`].filter(Boolean);
    contacts.push({
      key: `${key}:decision-maker`,
      kind: 'DECISION_MAKER',
      name: dm,
      title: r['decision_maker_title'] ?? null,
      emails: dmEmails.emails,
      phones: dmPhones.phones,
      unparsedPhones: dmPhones.unparsed,
      sourceUrl: null,
      note: notes.length ? notes.join(' · ') : null,
      confidence: 'RESEARCH',
      refs: refs('decision_maker', 'decision_maker_title', 'decision_maker_contact'),
    });
  }
  return contacts;
}

function buildIndiaAircraft(b: PlanBuilder, row: CellRow, operatorKey: string, attributionUncertain: boolean): PlannedAircraft | null {
  const plan = b.plan;
  const reg = normalizeRegistration(row.cells['registration']);
  if (reg.status === 'HEADER_ARTIFACT') {
    plan.rejected.push({ ref: row.ref, reason: 'Repeated PDF table header row (not an aircraft)' });
    return null;
  }
  if (!reg.value) {
    plan.rejected.push({ ref: row.ref, reason: `Registration ${reg.status.toLowerCase()}: ${reg.raw ?? '(blank)'}` });
    return null;
  }
  if (reg.status === 'REPAIRED') plan.repairs.push({ ref: row.ref, field: 'registration', from: reg.raw, to: reg.value, reason: 'Registration normalised' });

  const modelRaw = cell(row, 'model');
  const typeMatch = b.resolveType(modelRaw);
  const airframe = parseAirframeClass(row.cells['aircraft_type']);
  const seats = parseSeats(row.cells['seating_capacity']);
  const flags: string[] = [];
  if (seats.status === 'AMBIGUOUS') flags.push('SEATS_AMBIGUOUS');
  if (seats.status === 'REPAIRED') plan.repairs.push({ ref: row.ref, field: 'seating_capacity', from: seats.raw, to: seats.value === null ? null : String(seats.value), reason: 'Usage qualifier split from seat count' });
  if (typeMatch.kind === 'MATCHED' && airframe.value && typeMatch.type.airframeClass !== airframe.value) flags.push(`AIRFRAME_CLASS_MISMATCH:${airframe.value}->${typeMatch.type.airframeClass}`);
  if (typeMatch.kind === 'AMBIGUOUS') flags.push('TYPE_VARIANT_AMBIGUOUS');
  if (typeMatch.kind === 'UNMATCHED') flags.push('TYPE_UNMATCHED');
  if (attributionUncertain) flags.push('OPERATOR_ATTRIBUTION_UNCERTAIN');

  return {
    key: `REG:${reg.value}`,
    registration: reg.value,
    operatorKey,
    modelRaw,
    typeKey: typeMatch.kind === 'MATCHED' ? typeMatch.type.key : null,
    typeResolution: typeMatch.kind,
    typeFamilyHint: typeMatch.kind === 'AMBIGUOUS' ? typeMatch.family : null,
    airframeClass: airframe.value ?? (typeMatch.kind === 'MATCHED' ? typeMatch.type.airframeClass : null),
    seats: seats.value,
    seatsRaw: seats.raw,
    isCargo: seats.cargo || /freighter|cargo/i.test(modelRaw ?? ''),
    isAerialWork: seats.aerialWork,
    evidenceLevel: 'AUTHORITY_REGISTRY',
    sourceStatusRaw: 'Listed in DGCA NSOP operator list (31 May 2026)',
    usageRaw: null,
    sourceUrl: null,
    note: null,
    attributionUncertain,
    dataQualityFlags: flags,
    observations: [
      observation('model', modelRaw, row.ref, 'regulatory', 'AUTHORITY'),
      observation('seating_capacity', seats.raw, row.ref, 'regulatory', 'AUTHORITY'),
      observation('aircraft_type', clean(row.cells['aircraft_type']), row.ref, 'regulatory', 'AUTHORITY'),
      observation('operator_name', cell(row, 'operator_name'), row.ref, 'regulatory', 'AUTHORITY'),
    ],
    refs: [row.ref],
  };
}

/** Narrative research summaries keyed by operator NAME. Linked by normalised name; never create operators. */
function reconcileIndiaResearchSheets(src: SourceSet, b: PlanBuilder) {
  const plan = b.plan;
  const byKey = new Map<string, PlannedOperator[]>();
  for (const op of plan.operators.filter((o) => o.country === 'IN')) {
    for (const n of [op.legalName, ...op.aliases]) {
      const k = orgMatchKey(n);
      byKey.set(k, [...new Set([...(byKey.get(k) ?? []), op])]);
    }
  }
  const sheets = [
    { code: 'IN_FINAL_WEB_PASS', sheet: 'Final Web Pass' },
    { code: 'IN_DEEP_ENRICHED', sheet: 'Deep Web Research' },
    { code: 'IN_WEB_ENRICHED', sheet: 'Latest Web Research' },
  ];
  for (const s of sheets) {
    for (const row of src.sheet(s.code, s.sheet).rows) {
      const name = cell(row, 'operator');
      if (!name) continue;
      const matches = byKey.get(orgMatchKey(name)) ?? [];
      if (matches.length !== 1) {
        plan.warnings.push(`${s.code}/${s.sheet} row ${row.ref.row}: "${name}" matched ${matches.length} operators; research row kept as source record only.`);
        continue;
      }
      const op = matches[0]!;
      for (const [col, v] of Object.entries(row.cells)) {
        const value = clean(v);
        if (col === 'operator' || value === null) continue;
        op.observations.push(observation(`research_summary.${col}`, value, row.ref, 'research', 'RESEARCH'));
      }
      op.refs.push(row.ref);
    }
  }
  for (const row of src.sheet('IN_ENRICHED', 'Research Evidence').rows) {
    plan.evidenceSources.push({
      key: `${row.ref.source}:${row.ref.sheet}:${row.ref.row}`,
      label: cell(row, 'Source/entity') ?? 'Unnamed',
      organization: cell(row, 'Source/entity'),
      sourceType: cell(row, 'Evidence type'),
      asOf: cell(row, 'Freshness'),
      url: normalizeUrl(cell(row, 'Reference')).value,
      usage: cell(row, 'What we used it for'),
      ref: row.ref,
    });
  }
}

function checkIndiaMetadata(src: SourceSet, b: PlanBuilder) {
  const plan = b.plan;
  const primaryCount = src.sheet('IN_FINAL_WEB_PASS', 'Operators Enriched').rows.length;
  const crm = src.sheet('IN_OUTREACH_CRM', 'Operator Contacts').rows;
  const contacts = src.sheet('IN_CONTACTS', 'Operator Contacts').rows;
  const has = (r: CellRow, c: string) => cell(r, c) !== null;
  const count = (rows: CellRow[], pred: (r: CellRow) => boolean) => rows.filter(pred).length;

  const computed: Record<string, Record<string, () => number>> = {
    'IN_MAY_MASTER|README': {
      'Rows in extracted PDF master': () => primaryCount,
      'DGCA dashboard count': () => primaryCount,
    },
    'IN_CONTACTS|Contact Coverage': {
      'Total operators': () => contacts.length,
      'Operators with a DGCA contact record': () => count(contacts, (r) => has(r, 'contact_details')),
      'Normalized phone found': () => count(contacts, (r) => has(r, 'best_phone')),
      'Normalized email found': () => count(contacts, (r) => has(r, 'best_email')),
      'Phone + email': () => count(contacts, (r) => has(r, 'best_phone') && has(r, 'best_email')),
      'Phone only': () => count(contacts, (r) => has(r, 'best_phone') && !has(r, 'best_email')),
      'Email only': () => count(contacts, (r) => !has(r, 'best_phone') && has(r, 'best_email')),
      'Neither normalized': () => count(contacts, (r) => !has(r, 'best_phone') && !has(r, 'best_email')),
    },
    'IN_OUTREACH_CRM|Outreach Coverage': {
      Operators: () => crm.length,
      'Phone + email': () => count(crm, (r) => has(r, 'best_phone') && has(r, 'best_email')),
      'Decision-maker identified in this pass': () => count(crm, (r) => cell(r, 'decision_maker_status') === 'Identified'),
      'Company contact only': () => count(crm, (r) => cell(r, 'decision_maker_status') === 'Company contact only'),
      'Decision-maker with direct public contact': () => count(crm, (r) => has(r, 'decision_maker_contact')),
    },
  };
  for (const [k, metrics] of Object.entries(computed)) {
    const [code, sheet] = k.split('|') as [string, string];
    for (const row of src.sheet(code, sheet).rows) {
      const label = cell(row, 'Metric') ?? cell(row, 'Field');
      const stated = cell(row, 'Value');
      if (!label || stated === null) continue;
      const fn = metrics[label];
      if (!fn) continue;
      const statedNum = Number(/\d+/.exec(stated)?.[0]);
      const c = fn();
      plan.metadataChecks.push({ ref: row.ref, claim: label, stated, computed: String(c), consistent: statedNum === c });
    }
  }
}
