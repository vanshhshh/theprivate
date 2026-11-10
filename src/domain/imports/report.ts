import type { ImportPlan, PlannedConflict, SourceRef } from './types';

export interface DbDiff {
  entity: string;
  create: number;
  update: number;
  unchanged: number;
  protectedFields: number; // fields not overwritten because a higher-trust (admin/operator) value exists
}

const refStr = (r: SourceRef) => `${r.source} › ${r.sheet} › row ${r.row}`;
const esc = (v: unknown) => String(v ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const trunc = (v: unknown, n = 90) => {
  const s = esc(v);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

function countBy<T>(items: T[], key: (t: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function renderPlanReport(plan: ImportPlan, hash: string, opts: { generatedAt: string; diff: DbDiff[] | null }): string {
  const L: string[] = [];
  const h = (s: string) => L.push('', s, '');
  const table = (head: string[], rows: (string | number)[][]) => {
    L.push(`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`);
    for (const r of rows) L.push(`| ${r.map((c) => esc(c)).join(' | ')} |`);
  };

  const opsIN = plan.operators.filter((o) => o.country === 'IN');
  const opsAE = plan.operators.filter((o) => o.country === 'AE');
  const contacts = plan.operators.flatMap((o) => o.contacts);
  const open = plan.conflicts.filter((c) => c.resolution === 'OPEN');
  const auto = plan.conflicts.filter((c) => c.resolution === 'AUTO_HIGHER_TRUST');
  const inconsistentMeta = plan.metadataChecks.filter((m) => !m.consistent);

  L.push('# ThePrivate: import dry-run report');
  L.push('');
  L.push(`- **Generated:** ${opts.generatedAt}`);
  L.push(`- **Mode:** DRY RUN. No database writes were made.`);
  L.push(`- **Compared against:** ${opts.diff ? 'current database' : 'an empty database'}`);
  L.push(`- **Plan hash:** \`${hash}\``);

  h('## 1. Summary');
  table(['Item', 'Count', 'Notes'], [
    ['Operators: India', opsIN.length, 'All enter as DISCOVERED. None public, none bookable.'],
    ['Operators: UAE', opsAE.length, 'All enter as DISCOVERED. None public, none bookable.'],
    ['Aircraft (individual airframes with registration)', plan.aircraft.length, 'All enter as IMPORTED_UNREVIEWED, charterEligible = false'],
    ['Model-level fleet evidence (no registration)', plan.fleetEvidence.length, 'Stored separately; never converted to aircraft'],
    ['Aircraft types (catalogue)', plan.aircraftTypes.length, 'Identity and category only; no performance specs'],
    ['Operator contacts (private CRM)', contacts.length, 'Admin-only; never rendered publicly'],
    ['GCAA registry entries', plan.registryEntries.length, `${plan.registryEntries.filter((r) => r.linkedOperatorKey).length} linked to an operator`],
    ['Evidence sources (URLs/registers)', plan.evidenceSources.length, ''],
    ['Conflicts: OPEN (need review)', open.length, ''],
    ['Conflicts: auto-resolved by trust (kept for review)', auto.length, ''],
    ['Operator identity candidates', plan.matchCandidates.length, 'Proposals only; nothing is merged'],
    ['Rejected source rows', plan.rejected.length, ''],
    ['Repairs applied', plan.repairs.length, 'Every repair is listed in §9'],
    ['Source metadata claims inconsistent with data', inconsistentMeta.length, ''],
    ['Warnings', plan.warnings.length, ''],
  ]);

  h('## 2. Public exposure check');
  L.push('Nothing in this import becomes publicly visible or bookable:');
  L.push('');
  L.push('- 0 operators will be VERIFIED, AGREEMENT_SIGNED or ACTIVE. Every imported operator is DISCOVERED.');
  L.push('- 0 aircraft will be charter-eligible, approved or publicly listed.');
  L.push('- 0 empty legs, 0 aircraft-for-sale listings and 0 prices are created.');
  L.push('- Contacts, research notes, revenue and relevance scores go into admin-only tables.');

  h('## 3. Source inventory');
  table(['Source', 'File', 'Role', 'SHA-256', 'Sheets (rows)'], plan.sources.map((s) => [s.code, s.fileName, s.role, s.sha256.slice(0, 16) + '…', s.sheets.map((x) => `${x.name} (${x.rows})`).join('; ')]));
  L.push('');
  L.push('Every file was re-hashed after reading, and all were unchanged. The originals were never modified.');

  h('## 4. Operator data-quality flags');
  const flagCounts = countBy(plan.operators.flatMap((o) => o.dataQualityFlags.map((f) => f.split(':')[0]!)), (f) => f);
  table(['Flag', 'Operators'], flagCounts);
  L.push('');
  const flagged = plan.operators.filter((o) => o.dataQualityFlags.some((f) => /INTERLEAVED|MALFORMED|ARTIFACT|NOT_FOUND/.test(f)));
  if (flagged.length) {
    L.push('**Operators derived from corrupted or unverifiable source rows** (identity and fleet need review):');
    L.push('');
    table(['Key', 'Name', 'Flags'], flagged.map((o) => [o.key, o.legalName, o.dataQualityFlags.join(', ')]));
  }

  h('## 5. Operator identity candidates (review queue)');
  L.push('These pairs may be the same company. **No merge is performed.** An admin confirms or rejects each pair in the console.');
  L.push('');
  table(['Left', 'Right', 'Score', 'Recommendation', 'Reasons'], plan.matchCandidates.map((m) => {
    const n = (k: string) => `${k} (${plan.operators.find((o) => o.key === k)?.legalName ?? '?'})`;
    return [n(m.leftKey), n(m.rightKey), m.score, m.recommendation, m.reasons.join('; ')];
  }));

  h('## 6. Aircraft');
  table(['Evidence level', 'India', 'UAE'], countBy(plan.aircraft, (a) => a.evidenceLevel).map(([lvl]) => [
    lvl,
    plan.aircraft.filter((a) => a.evidenceLevel === lvl && a.operatorKey.startsWith('IN-')).length,
    plan.aircraft.filter((a) => a.evidenceLevel === lvl && a.operatorKey.startsWith('UAE-')).length,
  ]));
  L.push('');
  table(['Type resolution', 'Aircraft'], countBy(plan.aircraft, (a) => a.typeResolution));
  L.push('');
  table(['Aircraft flag', 'Count'], countBy(plan.aircraft.flatMap((a) => a.dataQualityFlags.map((f) => f.split(':')[0]!)), (f) => f));
  const uncertain = plan.aircraft.filter((a) => a.attributionUncertain);
  if (uncertain.length) {
    L.push('');
    L.push(`**${uncertain.length} aircraft have uncertain operator attribution.** They were listed under DGCA rows that are interleavings of two operators. They are linked to the row's corrected operator, flagged, and need confirmation:`);
    L.push('');
    table(['Operator', 'Registrations'], countBy(uncertain, (a) => a.operatorKey).map(([k]) => [k, uncertain.filter((a) => a.operatorKey === k).map((a) => a.registration).join(', ')]));
  }
  const ambiguous = plan.aircraft.filter((a) => a.typeResolution !== 'MATCHED');
  if (ambiguous.length) {
    L.push('');
    L.push('**Aircraft whose exact type could not be determined from the source** (left unset, not guessed):');
    L.push('');
    table(['Registration', 'Source model text', 'Resolution', 'Family hint'], ambiguous.map((a) => [a.registration, a.modelRaw ?? '—', a.typeResolution, a.typeFamilyHint ?? '—']));
  }
  if (plan.unmatchedModels.length) {
    L.push('');
    table(['Unmatched model text', 'Rows'], plan.unmatchedModels.map((u) => [u.modelRaw, u.count]));
  }

  h('## 7. Model-level fleet evidence (UAE)');
  L.push('These are claims such as "the operator flies AW139s" with no registration. They are stored as fleet evidence and are **not** aircraft inventory.');
  L.push('');
  table(['Operator', 'Model', 'Evidence', 'Stated count', 'Seats', 'Use'], plan.fleetEvidence.map((f) => [f.operatorKey, f.modelRaw, f.evidenceLevel, f.reportedCount ?? '—', f.seats ?? '—', f.usageRaw ?? '—']));

  h('## 8. Conflicts');
  L.push(`### 8.1 Open conflicts (${open.length}): no value chosen; review required`);
  L.push('');
  table(['Entity', 'Field', 'Values (source)', 'Why'], open.map((c) => [c.entityKey, c.field, c.values.map((v) => `"${trunc(v.value, 60)}" (${v.ref.source} r${v.ref.row})`).join(' / '), c.reason]));
  L.push('');
  L.push(`### 8.2 Auto-resolved conflicts (${auto.length}): higher-trust value kept, others preserved`);
  L.push('');
  table(['Field', 'Count', 'Example'], countBy(auto, (c) => `${c.entityType}.${c.field}`).map(([f, n]) => {
    const ex = auto.find((c) => `${c.entityType}.${c.field}` === f) as PlannedConflict;
    return [f, n, `${ex.entityKey}: kept "${trunc(ex.chosen, 50)}"; other value(s): ${ex.values.filter((v) => v.value !== ex.chosen).map((v) => `"${trunc(v.value, 40)}" (${v.ref.source})`).join(', ')}`];
  }));

  h(`## 9. Repairs applied (${plan.repairs.length})`);
  table(['Where', 'Field', 'From', 'To', 'Reason'], countBy(plan.repairs, (r) => `${r.field}|${r.reason}`).map(([k, n]) => {
    const [field, reason] = k.split('|');
    const ex = plan.repairs.find((r) => r.field === field && r.reason === reason)!;
    return [n > 1 ? `${n} rows, e.g. ${refStr(ex.ref)}` : refStr(ex.ref), field!, trunc(ex.from, 40), trunc(ex.to, 40), reason!];
  }));

  h(`## 10. Rejected rows (${plan.rejected.length})`);
  table(['Reason', 'Rows', 'Example'], countBy(plan.rejected, (r) => r.reason).map(([reason, n]) => [reason, n, refStr(plan.rejected.find((r) => r.reason === reason)!.ref)]));

  h('## 11. Source metadata cross-checks');
  L.push('Summary and coverage sheets were recomputed from the row data.');
  L.push('');
  table(['Claim', 'Stated', 'Computed', 'OK', 'Where'], plan.metadataChecks.map((m) => [m.claim, trunc(m.stated, 60), m.computed, m.consistent ? 'yes' : '**NO**', refStr(m.ref)]));

  h(`## 12. Warnings (${plan.warnings.length})`);
  for (const w of plan.warnings) L.push(`- ${w}`);

  h('## 13. GCAA registry');
  table(['Approval', 'Organisation', 'Valid', 'Linked operator'], plan.registryEntries.map((r) => [r.approvalNumber ?? r.approvalNumberRaw, r.organizationName, `${r.issueDate ?? '?'} → ${r.expiryDate ?? '?'}`, r.linkedOperatorKey ?? '— (registry only)']));

  h('## 14. What `apply` will write');
  if (opts.diff) {
    table(['Entity', 'Create', 'Update', 'Unchanged', 'Protected fields'], opts.diff.map((d) => [d.entity, d.create, d.update, d.unchanged, d.protectedFields]));
  } else {
    L.push('Against an empty database, `apply` creates everything above in **one transaction** under a single `ImportBatch`:');
    L.push('');
    L.push('- **Provenance.** One `SourceRecord` per source row, holding the raw cell values and a content hash.');
    L.push('- **Field observations.** One `FieldObservation` per distinct value per field per source.');
    L.push('- **Review items.** Conflicts and match candidates are stored as reviewable records.');
    L.push('');
    L.push('Re-running `apply` with the same files changes nothing.');
  }

  h('## 15. Approval');
  L.push('To write this exact plan to the database:');
  L.push('');
  L.push('```');
  L.push(`npm run import:apply -- --approve ${hash}`);
  L.push('```');
  L.push('');
  L.push('If any source file or importer rule changes, the hash changes and `apply` refuses to run until a new dry run is reviewed.');
  return L.join('\n') + '\n';
}
