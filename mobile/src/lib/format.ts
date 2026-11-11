import type { Airport } from '@/api/types';

/** Device locale for numbers and dates; the server decides currencies and time zones. */
const locale = typeof navigator !== 'undefined' ? navigator.language || 'en-GB' : 'en-GB';

export function money(amount: string | number, currency: string, opts: { compact?: boolean } = {}) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: opts.compact || Number.isInteger(n) ? 0 : 2 }).format(n);
}

/** A local calendar date (YYYY-MM-DD) shown as written, never shifted by the phone's zone. */
export function localDate(isoDay: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)));
}

/** An instant shown in a given IANA zone (e.g. the departure airport's), with the zone's short name. */
export function instant(iso: string, timeZone?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: timeZone ?? undefined, timeZoneName: timeZone ? 'short' : undefined }).format(new Date(iso));
}

export function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86_400), 'day');
}

export function place(a: Airport) {
  return a.city ?? a.name;
}

/** Today's date (YYYY-MM-DD) in an IANA zone, for date-picker minimums. */
export function todayIn(timeZone?: string | null) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone ?? undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
