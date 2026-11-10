/**
 * Pure normalisation helpers for imported aviation data.
 *
 * Contract: every function returns BOTH the cleaned value and a status, so callers can
 * record exactly what was repaired or rejected. Nothing here guesses a missing value.
 */

export type ParseStatus = 'OK' | 'EMPTY' | 'REPAIRED' | 'MALFORMED' | 'HEADER_ARTIFACT' | 'OBFUSCATED' | 'AMBIGUOUS';

export interface Parsed<T> {
  value: T | null;
  status: ParseStatus;
  raw: string | null;
  note?: string;
}

const NULL_TOKENS = new Set(['', 'n/a', 'na', 'nan', 'none', 'null', '-', '—', 'nil']);

/** Trim, collapse whitespace, and map placeholder tokens to null. */
export function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  const s = String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  return NULL_TOKENS.has(s.toLowerCase()) ? null : s;
}

// ---------------------------------------------------------------------------------------
// Aircraft registrations
// ---------------------------------------------------------------------------------------

/** Nationality-prefixed registrations seen in scope. Others fall back to the generic ICAO shape. */
const REGISTRATION_RULES: Record<string, RegExp> = {
  'VT-': /^VT-[A-Z]{3}$/, // India
  'A6-': /^A6-[A-Z0-9]{3}$/, // UAE
  'T7-': /^T7-[A-Z0-9]{1,5}$/, // San Marino (popular for business jets)
};
const GENERIC_REGISTRATION = /^[A-Z0-9]{1,2}-[A-Z0-9]{1,5}$/;

export function normalizeRegistration(raw: unknown): Parsed<string> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  if (/aircraft\s+registration/i.test(c)) return { value: null, status: 'HEADER_ARTIFACT', raw: c };
  const compact = c.toUpperCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
  const withHyphen = /^(VT|A6|T7)(?!-)/.test(compact) ? compact.replace(/^(VT|A6|T7)/, '$1-') : compact;
  const rule = Object.entries(REGISTRATION_RULES).find(([prefix]) => withHyphen.startsWith(prefix));
  const ok = rule ? rule[1].test(withHyphen) : GENERIC_REGISTRATION.test(withHyphen);
  if (!ok) return { value: null, status: 'MALFORMED', raw: c, note: 'Does not match registration format' };
  return { value: withHyphen, status: withHyphen === c ? 'OK' : 'REPAIRED', raw: c };
}

// ---------------------------------------------------------------------------------------
// Authority identifiers
// ---------------------------------------------------------------------------------------

/**
 * DGCA NSOP permit numbers appear as "#17/2025", "# 0 1 /2005", "# 4 /2014".
 * Interleaved PDF rows produce values like "## 1074//22002157" which are rejected as MALFORMED.
 */
export function normalizeDgcaPermitNumber(raw: unknown): Parsed<string> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  if (/##|\/\//.test(c)) return { value: null, status: 'MALFORMED', raw: c, note: 'Interleaved PDF extraction artifact' };
  const compact = c.replace(/[#\s]/g, '');
  const m = /^(\d{1,3})\/((?:19|20)\d{2})$/.exec(compact);
  if (!m) return { value: null, status: 'MALFORMED', raw: c };
  const value = `${m[1]!.padStart(2, '0')}/${m[2]}`;
  return { value, status: `#${value}` === c ? 'OK' : 'REPAIRED', raw: c };
}

/**
 * GCAA approval numbers: "AT-0001", "AC-0006", "AOA-0004", "PO-0001", "UAE-AOC-AT-0066", "AOC-AT-0064".
 * The canonical form keeps only the trailing class + serial (e.g. "AT-0066") so that
 * "UAE-AOC-AT-0066" and "AT-0066" reconcile; the raw value is always preserved.
 */
export function normalizeGcaaApproval(raw: unknown): Parsed<string> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  const m = /(?:^|-)((?:AT|AC|AOA|PO)-\d{4})$/i.exec(c.toUpperCase().replace(/\s+/g, ''));
  if (!m) return { value: null, status: 'MALFORMED', raw: c };
  const value = m[1]!.toUpperCase();
  return { value, status: value === c ? 'OK' : 'REPAIRED', raw: c };
}

// ---------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------

function isoDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** "15.10.2030" → "2030-10-15". Garbled values ("1252..1005..22003209") are MALFORMED. */
export function parseDottedDate(raw: unknown): Parsed<string> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(c);
  const iso = m ? isoDate(Number(m[3]), Number(m[2]), Number(m[1])) : null;
  return iso ? { value: iso, status: 'OK', raw: c } : { value: null, status: 'MALFORMED', raw: c };
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** "05/Jan/2025" → "2025-01-05". */
export function parseGcaaDate(raw: unknown): Parsed<string> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  const m = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/.exec(c);
  const month = m ? MONTHS[m[2]!.toLowerCase()] : undefined;
  const iso = m && month ? isoDate(Number(m[3]), month, Number(m[1])) : null;
  return iso ? { value: iso, status: 'OK', raw: c } : { value: null, status: 'MALFORMED', raw: c };
}

/** Excel may give a Date, an ISO string, or "2026-08-16". */
export function parseIsoDate(raw: unknown): Parsed<string> {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return { value: raw.toISOString().slice(0, 10), status: 'OK', raw: raw.toISOString() };
  }
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(c);
  const iso = m ? isoDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
  return iso ? { value: iso, status: 'OK', raw: c } : { value: null, status: 'MALFORMED', raw: c };
}

// ---------------------------------------------------------------------------------------
// Contact data
// ---------------------------------------------------------------------------------------

const EMAIL_RE = /^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/** Splits on ; , / and whitespace-separated lists; validates each address. */
export function parseEmails(raw: unknown): { emails: string[]; rejected: string[]; obfuscated: boolean } {
  const c = clean(raw);
  if (!c) return { emails: [], rejected: [], obfuscated: false };
  // Cloudflare e-mail protection leaves "[email protected]" in scraped pages.
  if (/\[email[\s ]*protected\]/i.test(c)) return { emails: [], rejected: [c], obfuscated: true };
  const parts = c.split(/[;,/\s]+/).map((p) => p.trim().replace(/^mailto:/i, '').replace(/[.)]+$/, '')).filter(Boolean);
  const emails: string[] = [];
  const rejected: string[] = [];
  for (const p of parts) {
    if (!p.includes('@')) continue; // phone numbers or words in a mixed field
    (EMAIL_RE.test(p) ? emails : rejected).push(p.toLowerCase());
  }
  return { emails: [...new Set(emails)], rejected, obfuscated: false };
}

const COUNTRY_DIAL: Record<string, string> = { IN: '91', AE: '971' };

/**
 * Normalises phone numbers to E.164 where the country rules are unambiguous.
 * Indian landlines written with a trunk "0" (e.g. 01124611077) become +911124611077.
 * Anything that cannot be normalised confidently is kept raw and reported.
 */
export function parsePhones(raw: unknown, country: 'IN' | 'AE'): { phones: string[]; unparsed: string[] } {
  const c = clean(raw);
  if (!c) return { phones: [], unparsed: [] };
  const chunks = c
    .split(/[;,|]|\s\/\s|\bor\b/i)
    .map((s) => s.replace(/^(tel|phone|mob(ile)?|charter|fax)\s*:?\s*/i, '').trim())
    .filter((s) => /\d{5,}/.test(s.replace(/[\s()-]/g, '')));
  const phones: string[] = [];
  const unparsed: string[] = [];
  const cc = COUNTRY_DIAL[country]!;
  for (const chunk of chunks) {
    const hasPlus = chunk.trim().startsWith('+');
    let digits = chunk.replace(/\D/g, '');
    if (hasPlus) {
      if (digits.length >= 8 && digits.length <= 15) phones.push(`+${digits}`);
      else unparsed.push(chunk);
      continue;
    }
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
      if (digits.length >= 8 && digits.length <= 15) phones.push(`+${digits}`);
      else unparsed.push(chunk);
      continue;
    }
    if (country === 'IN') {
      if (digits.length === 10 && /^[6-9]/.test(digits)) phones.push(`+91${digits}`);
      else if (digits.length === 11 && digits.startsWith('0')) phones.push(`+91${digits.slice(1)}`);
      else if (digits.length === 12 && digits.startsWith('91')) phones.push(`+${digits}`);
      else unparsed.push(chunk);
    } else {
      if (digits.length === 10 && digits.startsWith('0')) phones.push(`+${cc}${digits.slice(1)}`);
      else if (digits.length === 9 && /^[2-9]/.test(digits)) phones.push(`+${cc}${digits}`);
      else if (digits.startsWith(cc) && digits.length >= 11 && digits.length <= 12) phones.push(`+${digits}`);
      else unparsed.push(chunk);
    }
  }
  return { phones: [...new Set(phones)], unparsed };
}

export function normalizeUrl(raw: unknown): Parsed<string> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  const candidate = /^https?:\/\//i.test(c) ? c : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(c) ? `https://${c}` : null;
  if (!candidate) return { value: null, status: 'MALFORMED', raw: c, note: 'Not a URL (descriptive text)' };
  try {
    const u = new URL(candidate);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw new Error('bad');
    u.hostname = u.hostname.toLowerCase();
    const value = u.toString();
    return { value, status: value === c ? 'OK' : 'REPAIRED', raw: c };
  } catch {
    return { value: null, status: 'MALFORMED', raw: c };
  }
}

// ---------------------------------------------------------------------------------------
// Aircraft attributes
// ---------------------------------------------------------------------------------------

export interface SeatParse extends Parsed<number> {
  aerialWork: boolean;
  cargo: boolean;
}

/**
 * DGCA seating column values: "6", "6/Aerial Work", "Aerial Work", "Cargo",
 * plus extraction artifacts like "1 6" (two cells merged) which are AMBIGUOUS.
 */
export function parseSeats(raw: unknown): SeatParse {
  const c = clean(raw);
  const base = { aerialWork: false, cargo: false };
  if (!c) return { ...base, value: null, status: 'EMPTY', raw: null };
  if (/seating\s+capacity/i.test(c)) return { ...base, value: null, status: 'HEADER_ARTIFACT', raw: c };
  const aerialWork = /aerial\s*work/i.test(c);
  const cargo = /cargo|freighter/i.test(c);
  const numeric = c.replace(/aerial\s*work|cargo/gi, '').replace(/\//g, ' ').trim();
  if (!numeric) return { aerialWork, cargo, value: null, status: 'OK', raw: c, note: 'No passenger seats stated' };
  if (/^\d{1,3}$/.test(numeric)) {
    const n = Number(numeric);
    if (n >= 1 && n <= 400) return { aerialWork, cargo, value: n, status: aerialWork || cargo ? 'REPAIRED' : 'OK', raw: c };
  }
  return { aerialWork, cargo, value: null, status: 'AMBIGUOUS', raw: c, note: 'Seat value cannot be read unambiguously' };
}

export type AirframeClass = 'FIXED_WING' | 'ROTARY_WING' | 'BALLOON';

export function parseAirframeClass(raw: unknown): Parsed<AirframeClass> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  if (/^aircraft type/i.test(c)) return { value: null, status: 'HEADER_ARTIFACT', raw: c };
  const map: Record<string, AirframeClass> = { FW: 'FIXED_WING', RW: 'ROTARY_WING', B: 'BALLOON', HAB: 'BALLOON' };
  const v = map[c.toUpperCase()];
  return v ? { value: v, status: 'OK', raw: c } : { value: null, status: 'MALFORMED', raw: c };
}

export type OperatingScope = 'DOMESTIC' | 'INTERNATIONAL';

/** DGCA "D" / "I". Doubled letters ("DD", "DI") come from interleaved rows. */
export function parseOperatingScope(raw: unknown): Parsed<OperatingScope> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  if (c === 'D') return { value: 'DOMESTIC', status: 'OK', raw: c };
  if (c === 'I') return { value: 'INTERNATIONAL', status: 'OK', raw: c };
  return { value: null, status: 'MALFORMED', raw: c, note: 'Interleaved PDF extraction artifact' };
}

export function parseInteger(raw: unknown): Parsed<number> {
  const c = clean(raw);
  if (!c) return { value: null, status: 'EMPTY', raw: null };
  return /^\d+$/.test(c) ? { value: Number(c), status: 'OK', raw: c } : { value: null, status: 'MALFORMED', raw: c };
}

// ---------------------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------------------

const LEGAL_SUFFIXES = [
  'private limited', 'pvt ltd', 'pvt limited', 'private ltd', 'pvt', 'limited', 'ltd', 'llp', 'llc', 'l l c',
  'fze', 'fzco', 'fz llc', 'company', 'co', 'inc', 'corporation', 'corp', 'p',
];

/**
 * Matching key for organisation names: case/punctuation-insensitive, "&" == "and",
 * legal suffixes removed. Used ONLY for candidate generation, never as an identity on its own.
 */
export function orgMatchKey(name: string): string {
  let s = name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of LEGAL_SUFFIXES) {
      if (s.endsWith(` ${suf}`)) {
        s = s.slice(0, -suf.length - 1).trim();
        changed = true;
      }
    }
  }
  return s.replace(/\s+/g, ' ');
}

/** Dice coefficient over character bigrams of the match keys (0..1). */
export function nameSimilarity(a: string, b: string): number {
  const x = orgMatchKey(a).replace(/ /g, '');
  const y = orgMatchKey(b).replace(/ /g, '');
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const gx = grams(x);
  const gy = grams(y);
  let overlap = 0;
  for (const [g, n] of gx) overlap += Math.min(n, gy.get(g) ?? 0);
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

/** Heuristic for the interleaved-row artefact: names that look like two names zipped together. */
export function looksInterleaved(name: string): boolean {
  // e.g. "AGleorboakla Vliencgtar ..." – unusual upper-case letters inside words.
  const words = name.split(/\s+/).filter((w) => w.length > 3);
  const odd = words.filter((w) => /^[A-Z][A-Z][a-z]/.test(w) || /[a-z][A-Z][a-z]/.test(w.slice(1)));
  return odd.length >= 2;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
