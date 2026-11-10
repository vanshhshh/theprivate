import { describe, expect, it } from 'vitest';
import { findOperatorMatchCandidates } from '@/domain/imports/plan';
import { comparable, resolveLayered } from '@/domain/imports/shared';
import type { PlannedOperator } from '@/domain/imports/types';

const ref = (source: string, row = 2) => ({ source, sheet: 'S', row });

describe('layered resolution', () => {
  it('keeps the higher-trust value and preserves the others as an auto-resolved conflict', () => {
    const r = resolveLayered('E', 'OPERATOR', 'website', [
      { value: 'https://a.in/', ref: ref('LOW'), trust: 10 },
      { value: 'https://b.in/', ref: ref('HIGH'), trust: 100 },
    ], { trackConflict: true });
    expect(r.value).toBe('https://b.in/');
    expect(r.conflict?.resolution).toBe('AUTO_HIGHER_TRUST');
    expect(r.conflict?.values).toHaveLength(2);
  });
  it('does not let a stronger source\'s blank erase a weaker source\'s value', () => {
    const r = resolveLayered('E', 'OPERATOR', 'x', [
      { value: null, ref: ref('HIGH'), trust: 100 },
      { value: 'kept', ref: ref('LOW'), trust: 10 },
    ], { trackConflict: true });
    expect(r.value).toBe('kept');
    expect(r.conflict).toBeNull();
  });
  it('refuses to choose between equal-trust disagreeing sources', () => {
    const r = resolveLayered('E', 'OPERATOR', 'x', [
      { value: 'a', ref: ref('S1'), trust: 50 },
      { value: 'b', ref: ref('S2'), trust: 50 },
    ], { trackConflict: false });
    expect(r.value).toBeNull();
    expect(r.conflict?.resolution).toBe('OPEN');
  });
  it('treats reordered lists as equal', () => {
    expect(comparable('+91 9999741207; sales@flapsaviation.in')).toBe(comparable('sales@flapsaviation.in / +91 9999741207'));
  });
});

function op(key: string, name: string, country: 'IN' | 'AE', auth: string | null, flags: string[] = []): PlannedOperator {
  return {
    key, country, legalName: name, displayName: name, aliases: [], slugBase: '', website: null, linkedinUrl: null,
    instagramHandle: null, address: null, baseDescription: null, marketplaceRelevance: null, charterActivity: null,
    operatorKind: null, fleetClassesRaw: null,
    authorizations: [{
      authority: 'DGCA', certificateType: 'NSOP', numberRaw: auth, numberNormalized: auth, numberStatus: auth ? 'VALID' : 'MALFORMED',
      validFrom: null, validUntil: null, validUntilRaw: null, scope: null, scopeRaw: null, ref: ref('X'),
    }],
    contacts: [], dataQualityFlags: flags, observations: [], refs: [],
  };
}

describe('identity candidates', () => {
  it('proposes (never merges) duplicates from corrupted rows and separates countries', () => {
    const c = findOperatorMatchCandidates([
      op('IN:1', 'Span Air Pvt. Ltd.', 'IN', '06/1995'),
      op('IN:2', 'Span Air Pvt. Ltd.', 'IN', null, ['SOURCE_ROW_INTERLEAVED']),
      op('IN:3', 'Falcon Aviation Services Pvt. Ltd.', 'IN', '01/2000'),
      op('AE:1', 'Falcon Aviation Services', 'AE', null),
    ]);
    expect(c.find((x) => x.leftKey === 'IN:1' && x.rightKey === 'IN:2')?.recommendation).toBe('LIKELY_SAME');
    expect(c.find((x) => x.rightKey === 'AE:1')?.recommendation).toBe('LIKELY_DISTINCT');
  });
  it('flags a permit-number collision between different companies', () => {
    const c = findOperatorMatchCandidates([op('IN:61', 'Kairamya Aviation', 'IN', '19/2025'), op('IN:115', 'Smart Wings Aviation', 'IN', '19/2025')]);
    expect(c[0]?.recommendation).toBe('LIKELY_DISTINCT');
    expect(c[0]?.reasons.join(' ')).toMatch(/collision/);
  });
});
