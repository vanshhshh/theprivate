/**
 * Converts a local wall-clock time at an IANA zone to a UTC instant without external libs.
 * Returns null when the zone or time is unknown (we never guess a timezone).
 */
export function localToUtc(date: string, time: string | null, timeZone: string | null): Date | null {
  if (!timeZone || !time) return null;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess - zoneOffsetMinutes(new Date(first), timeZone) * 60_000);
}

export function zoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** Formats a calendar date (DB `date` columns are stored at UTC midnight). */
export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = DATE_OPTS, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone }).format(typeof d === 'string' ? new Date(d) : d);
}

export function formatDateTime(d: Date, timeZone = 'Asia/Kolkata'): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(d);
}

export function todayIso(timeZone = 'Asia/Kolkata'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
