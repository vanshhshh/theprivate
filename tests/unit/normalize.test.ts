import { describe, expect, it } from 'vitest';
import {
  looksInterleaved,
  nameSimilarity,
  normalizeDgcaPermitNumber,
  normalizeGcaaApproval,
  normalizeRegistration,
  normalizeUrl,
  orgMatchKey,
  parseDottedDate,
  parseEmails,
  parseGcaaDate,
  parseOperatingScope,
  parsePhones,
  parseSeats,
} from '@/domain/imports/normalize';

describe('registrations', () => {
  it('accepts national formats and repairs spacing/hyphens', () => {
    expect(normalizeRegistration('VT-AFO')).toMatchObject({ value: 'VT-AFO', status: 'OK' });
    expect(normalizeRegistration(' vt afo ')).toMatchObject({ value: 'VT-AFO', status: 'REPAIRED' });
    expect(normalizeRegistration('T7-ALEX1')).toMatchObject({ value: 'T7-ALEX1' });
    expect(normalizeRegistration('A6-RJZ').value).toBe('A6-RJZ');
  });
  it('rejects repeated PDF headers and malformed values', () => {
    expect(normalizeRegistration('AIRCRAFT REGISTRATION').status).toBe('HEADER_ARTIFACT');
    expect(normalizeRegistration('VT-ABCD').status).toBe('MALFORMED');
    expect(normalizeRegistration(null).status).toBe('EMPTY');
  });
});

describe('authority identifiers', () => {
  it('normalises DGCA permit numbers', () => {
    expect(normalizeDgcaPermitNumber('#17/2025')).toMatchObject({ value: '17/2025', status: 'OK' });
    expect(normalizeDgcaPermitNumber('# 0 1 /2005').value).toBe('01/2005');
    expect(normalizeDgcaPermitNumber('# 4 /2014').value).toBe('04/2014');
  });
  it('flags interleaved extraction artifacts instead of guessing', () => {
    const r = normalizeDgcaPermitNumber('## 1078//21092958');
    expect(r.value).toBeNull();
    expect(r.status).toBe('MALFORMED');
    expect(r.note).toMatch(/Interleaved/);
  });
  it('reconciles GCAA approval prefixes', () => {
    expect(normalizeGcaaApproval('UAE-AOC-AT-0066').value).toBe('AT-0066');
    expect(normalizeGcaaApproval('AOC-AT-0064').value).toBe('AT-0064');
    expect(normalizeGcaaApproval('AOA-0004')).toMatchObject({ value: 'AOA-0004', status: 'OK' });
  });
});

describe('dates and scope', () => {
  it('parses valid dates and rejects impossible ones', () => {
    expect(parseDottedDate('15.10.2030').value).toBe('2030-10-15');
    expect(parseDottedDate('31.02.2030').status).toBe('MALFORMED');
    expect(parseDottedDate('1252..1005..22003209').status).toBe('MALFORMED');
    expect(parseGcaaDate('05/Jan/2025').value).toBe('2025-01-05');
  });
  it('treats doubled scope letters as artifacts', () => {
    expect(parseOperatingScope('D').value).toBe('DOMESTIC');
    expect(parseOperatingScope('DI').status).toBe('MALFORMED');
  });
});

describe('contacts', () => {
  it('splits and validates e-mail lists, detects obfuscation', () => {
    expect(parseEmails('sales@x.ae; Info@Y.ae').emails).toEqual(['sales@x.ae', 'info@y.ae']);
    expect(parseEmails('[email protected]').obfuscated).toBe(true);
  });
  it('normalises Indian and UAE numbers to E.164', () => {
    expect(parsePhones('01124611077', 'IN').phones).toEqual(['+911124611077']);
    expect(parsePhones('Tel : +91 9338527773 | Fax: N/A', 'IN').phones).toEqual(['+919338527773']);
    expect(parsePhones('+971 2 5758000; charter +971 50 6174092', 'AE').phones).toEqual(['+97125758000', '+971506174092']);
  });
  it('does not treat descriptive text as a URL', () => {
    expect(normalizeUrl('Afcom Holdings Ltd (LinkedIn)').status).toBe('MALFORMED');
    expect(normalizeUrl('airkalinga.in').value).toBe('https://airkalinga.in/');
  });
});

describe('seats', () => {
  it('separates usage qualifiers and refuses ambiguous values', () => {
    expect(parseSeats('6/Aerial Work')).toMatchObject({ value: 6, aerialWork: true });
    expect(parseSeats('Cargo')).toMatchObject({ value: null, cargo: true });
    expect(parseSeats('1 6')).toMatchObject({ value: null, status: 'AMBIGUOUS' });
    expect(parseSeats('Seating Capacity').status).toBe('HEADER_ARTIFACT');
  });
});

describe('names', () => {
  it('matches legal-suffix variants', () => {
    expect(orgMatchKey('Carewell Aviation India Private Limited')).toBe(orgMatchKey('Carewell Aviation India Pvt. Ltd.'));
    expect(orgMatchKey('Gulf Wings FZE')).toBe('gulf wings');
    expect(nameSimilarity('MSPL Ltd.', 'MSPL Limited')).toBe(1);
  });
  it('detects zipped names from the raw extraction', () => {
    expect(looksInterleaved('CAheirposkaanli Anvgiaa Ativoina tPiovnt. PLtvdt.. L t d .')).toBe(true);
    expect(looksInterleaved('Global Vectra Helicorp Ltd.')).toBe(false);
  });
});
