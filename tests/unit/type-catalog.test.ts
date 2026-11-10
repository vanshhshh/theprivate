import { describe, expect, it } from 'vitest';
import { matchAircraftType } from '@/domain/aircraft/type-catalog';

const key = (raw: string) => {
  const m = matchAircraftType(raw);
  return m.kind === 'MATCHED' ? m.type.key : m.kind;
};

describe('aircraft type catalogue', () => {
  it.each([
    ['BD-700-2A12 (G7500)', 'bombardier-global-7500'],
    ['Global 7500 BD700-2A-12', 'bombardier-global-7500'],
    ['CL-600-2B16 CL 604 VARIANT (CL605)', 'bombardier-challenger-605'],
    ['AS 350 B3 ECUREUIL', 'airbus-helicopters-as350-b3'],
    ['AS 350 B3e', 'airbus-helicopters-h125-as350-b3e'],
    ['AGUSTA A109SP', 'leonardo-aw109s-grand-sp'],
    ['BEECH SUPER KING AIR 250 B- 200GT', 'beechcraft-king-air-b200gt-250'],
    ['Cessna Citation 560XLS+', 'cessna-citation-xls'],
    ['ULTRAMAGIC N-425 (HOT AIR BALLOON)', 'ultramagic-n-425'],
    ['Gulfstream G600', 'gulfstream-g600'],
  ])('%s → %s', (raw, expected) => expect(key(raw)).toBe(expected));

  it('does not guess variants the source does not state', () => {
    expect(key('EMB-135BJ')).toBe('AMBIGUOUS');
    expect(key('Boeing Business Jet')).toBe('AMBIGUOUS');
    expect(key('Bombardier BD-700-1A10')).toBe('AMBIGUOUS');
    expect(key('DAUPHIN 2')).toBe('AMBIGUOUS');
  });

  it('never confuses Global 6000 with Gulfstream G600', () => {
    expect(key('BD-700-1A10(G6000)')).toBe('bombardier-global-6000');
  });
});
