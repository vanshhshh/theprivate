import { reconcileIndia } from './india';
import { nameSimilarity, orgMatchKey } from './normalize';
import { PlanBuilder, SourceSet } from './shared';
import { reconcileUae } from './uae';
import type { ImportPlan, LoadedSource, PlannedMatchCandidate, PlannedOperator } from './types';

/** Pure: same inputs ⇒ identical plan (and plan hash). No clock, no randomness, no I/O. */
export function buildImportPlan(loaded: LoadedSource[]): ImportPlan {
  const src = new SourceSet(loaded);
  const b = new PlanBuilder();
  b.plan.sources = loaded.map((l) => ({
    code: l.descriptor.code,
    fileName: l.descriptor.fileName,
    sha256: l.sha256,
    byteLength: l.byteLength,
    role: l.descriptor.role,
    sheets: l.sheets.map((s) => ({ name: s.name, rows: s.rows.length })),
  }));
  reconcileIndia(src, b);
  reconcileUae(src, b);
  b.plan.matchCandidates = findOperatorMatchCandidates(b.plan.operators);
  return b.finalize();
}

const MALFORMED_FLAGS = ['SOURCE_ROW_INTERLEAVED', 'AUTHORITY_NUMBER_MALFORMED'];

/**
 * Identity candidates are PROPOSALS for admin review. Nothing is merged automatically:
 * the source rows are known to contain corrupted DGCA rows whose attribution is uncertain.
 */
export function findOperatorMatchCandidates(ops: PlannedOperator[]): PlannedMatchCandidate[] {
  const out: PlannedMatchCandidate[] = [];
  const names = (o: PlannedOperator) => [o.legalName, ...o.aliases];
  for (let i = 0; i < ops.length; i++) {
    for (let j = i + 1; j < ops.length; j++) {
      const a = ops[i]!;
      const b = ops[j]!;
      let sim = 0;
      let contains = false;
      for (const na of names(a)) {
        for (const nb of names(b)) {
          sim = Math.max(sim, nameSimilarity(na, nb));
          const ka = orgMatchKey(na);
          const kb = orgMatchKey(nb);
          if ((ka.length >= 8 && kb.includes(ka)) || (kb.length >= 8 && ka.includes(kb))) contains = true;
        }
      }
      const authA = a.authorizations.find((x) => x.numberNormalized);
      const authB = b.authorizations.find((x) => x.numberNormalized);
      const sameAuth = Boolean(authA && authB && authA.authority === authB.authority && authA.numberNormalized === authB.numberNormalized);
      if (!(sim >= 0.85 || contains || sameAuth)) continue;

      const reasons: string[] = [`name similarity ${sim.toFixed(2)}`];
      if (contains) reasons.push('one name contains the other');
      if (sameAuth) reasons.push(`same ${authA!.authority} number ${authA!.numberNormalized}`);
      const corrupted = [a, b].filter((o) => o.dataQualityFlags.some((f) => MALFORMED_FLAGS.includes(f)));
      if (corrupted.length) reasons.push(`${corrupted.map((o) => o.key).join(', ')} derived from a corrupted (interleaved) DGCA row`);
      if (sameAuth && authA!.validUntil !== authB!.validUntil) reasons.push(`validity differs (${authA!.validUntil ?? '—'} vs ${authB!.validUntil ?? '—'})`);

      let recommendation: PlannedMatchCandidate['recommendation'];
      if (a.country !== b.country) {
        recommendation = 'LIKELY_DISTINCT';
        reasons.push('different countries and regulators');
      } else if (sameAuth && sim < 0.6) {
        // Two clearly different companies cannot hold the same permit: one record is wrong.
        recommendation = 'LIKELY_DISTINCT';
        reasons.push('permit number collision between different companies: verify against the regulator');
      } else if (sim === 1 && corrupted.length > 0) {
        recommendation = 'LIKELY_SAME';
      } else if (sameAuth && sim >= 0.9) {
        recommendation = 'LIKELY_SAME';
      } else {
        recommendation = 'POSSIBLY_SAME';
      }
      out.push({ entityType: 'OPERATOR', leftKey: a.key, rightKey: b.key, score: Math.round(Math.min(1, sim + (sameAuth ? 0.1 : 0)) * 100) / 100, reasons, recommendation });
    }
  }
  return out;
}
