/**
 * Building blocks shared by the India and UAE reconcilers: sheet access, layered field
 * resolution (highest trust wins, disagreements recorded), and the plan accumulator.
 */
import { matchAircraftType, type TypeMatch } from '../aircraft/type-catalog';
import { clean } from './normalize';
import type {
  CellRow,
  Confidence,
  FieldGroup,
  ImportPlan,
  LoadedSheet,
  LoadedSource,
  Observation,
  PlannedAircraftType,
  PlannedConflict,
  SourceRef,
} from './types';

export class SourceSet {
  constructor(private readonly loaded: LoadedSource[]) {}

  source(code: string): LoadedSource {
    const s = this.loaded.find((l) => l.descriptor.code === code);
    if (!s) throw new Error(`Source ${code} not loaded`);
    return s;
  }

  sheet(code: string, name: string): LoadedSheet {
    const sh = this.source(code).sheets.find((s) => s.name === name);
    if (!sh) throw new Error(`Sheet "${name}" missing from ${code}`);
    return sh;
  }

  trust(code: string, group: FieldGroup): number {
    return this.source(code).descriptor.trust[group] ?? 0;
  }

  all(): LoadedSource[] {
    return this.loaded;
  }
}

export function cell(row: CellRow, column: string): string | null {
  return clean(row.cells[column]);
}

export function rawCell(row: CellRow, column: string): unknown {
  return row.cells[column] ?? null;
}

/**
 * Comparison key that ignores case, spacing, list-separator style and list order
 * ("+91 99; a@b.in" == "a@b.in / +91 99"). URLs are compared whole.
 */
export function comparable(v: string | number | boolean | null): string | null {
  if (v === null) return null;
  const s = String(v).toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^https?:\/\/\S+$/.test(s)) return s.replace(/\/+$/, '');
  return s
    .split(/\s*[;|,]\s*|\s+\/\s+/)
    .map((p) => p.replace(/[.\s]+$/, '').trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

export interface LayeredValue {
  value: string | null;
  ref: SourceRef;
  trust: number;
}

/**
 * Resolve one field from several source layers. Returns the highest-trust non-null value and,
 * when non-null values disagree, a conflict record that preserves every value and its source.
 */
export function resolveLayered(
  entityKey: string,
  entityType: PlannedConflict['entityType'],
  field: string,
  values: LayeredValue[],
  opts: { trackConflict: boolean },
): { value: string | null; ref: SourceRef | null; conflict: PlannedConflict | null } {
  const present = values.filter((v) => v.value !== null).sort((a, b) => b.trust - a.trust || a.ref.source.localeCompare(b.ref.source));
  const winner = present[0] ?? null;
  if (!winner) return { value: null, ref: null, conflict: null };
  const distinct = new Set(present.map((p) => comparable(p.value)));
  // Equal-trust sources that disagree cannot be decided automatically: no value is chosen.
  const tied = present.some((p) => p.trust === winner.trust && comparable(p.value) !== comparable(winner.value));
  let conflict: PlannedConflict | null = null;
  if ((opts.trackConflict || tied) && distinct.size > 1) {
    conflict = {
      entityKey,
      entityType,
      field,
      values: present.map((p) => ({ value: p.value, ref: p.ref, trust: p.trust })),
      resolution: tied ? 'OPEN' : 'AUTO_HIGHER_TRUST',
      chosen: tied ? null : winner.value,
      reason: tied
        ? 'Sources of equal trust disagree; requires review.'
        : `Value from ${winner.ref.source} (trust ${winner.trust}) retained; other values preserved for review.`,
    };
  }
  return { value: tied ? null : winner.value, ref: winner.ref, conflict };
}

export function observation(field: string, value: string | number | boolean | null, ref: SourceRef, group: FieldGroup, confidence: Confidence): Observation {
  return { field, value, ref, group, confidence };
}

/** Accumulates plan parts so the India and UAE reconcilers can contribute independently. */
export class PlanBuilder {
  readonly plan: ImportPlan;
  private readonly types = new Map<string, PlannedAircraftType>();
  private readonly unmatched = new Map<string, number>();

  constructor() {
    this.plan = {
      version: 1,
      sources: [],
      aircraftTypes: [],
      operators: [],
      aircraft: [],
      fleetEvidence: [],
      registryEntries: [],
      evidenceSources: [],
      conflicts: [],
      matchCandidates: [],
      rejected: [],
      repairs: [],
      metadataChecks: [],
      unmatchedModels: [],
      warnings: [],
    };
  }

  resolveType(modelRaw: string | null): TypeMatch {
    const m = matchAircraftType(modelRaw);
    if (m.kind === 'MATCHED') this.types.set(m.type.key, m.type);
    if (m.kind === 'UNMATCHED' && modelRaw) this.unmatched.set(modelRaw, (this.unmatched.get(modelRaw) ?? 0) + 1);
    return m;
  }

  finalize(): ImportPlan {
    const p = this.plan;
    p.aircraftTypes = [...this.types.values()].sort((a, b) => a.key.localeCompare(b.key));
    p.unmatchedModels = [...this.unmatched.entries()].map(([modelRaw, count]) => ({ modelRaw, count })).sort((a, b) => a.modelRaw.localeCompare(b.modelRaw));
    const byRef = (a: { ref: SourceRef }, b: { ref: SourceRef }) =>
      a.ref.source.localeCompare(b.ref.source) || a.ref.sheet.localeCompare(b.ref.sheet) || a.ref.row - b.ref.row;
    p.operators.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
    p.aircraft.sort((a, b) => a.key.localeCompare(b.key));
    p.fleetEvidence.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
    p.registryEntries.sort((a, b) => a.key.localeCompare(b.key));
    p.evidenceSources.sort((a, b) => a.key.localeCompare(b.key));
    p.conflicts.sort((a, b) => a.entityKey.localeCompare(b.entityKey, 'en', { numeric: true }) || a.field.localeCompare(b.field));
    p.matchCandidates.sort((a, b) => b.score - a.score || a.leftKey.localeCompare(b.leftKey, 'en', { numeric: true }));
    p.rejected.sort(byRef);
    p.repairs.sort(byRef);
    p.metadataChecks.sort(byRef);
    return p;
  }
}
