import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capacitor plugins have no native side in unit tests.
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: async () => ({ value: null }), set: async () => {}, remove: async () => {} } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }));
vi.mock('@aparajita/capacitor-secure-storage', () => ({ SecureStorage: {}, KeychainAccess: {} }));

const { appPathFor } = await import('@/lib/links');
const { planProblems, toRequestBody } = await import('@/state/plan');
const { localDate } = await import('@/lib/format');
const { api, ApiError } = await import('@/api/client');
const { writeToken, clearToken } = await import('@/auth/token');

const BOM = { id: 'a1', code: 'BOM', icao: 'VABB', iata: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai', country: 'IN', timezone: 'Asia/Kolkata', kind: 'LARGE_AIRPORT' };
const DXB = { ...BOM, id: 'a2', code: 'DXB', icao: 'OMDB', iata: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'AE', timezone: 'Asia/Dubai' };
const base = { tripType: 'ONE_WAY' as const, from: BOM, to: DXB, date: '2026-12-01', time: '', returnDate: '', returnTime: '', passengers: 4, category: '', requirements: '', petsOnBoard: false };

describe('deep links', () => {
  it('maps customer pages on theprivate.in to app screens', () => {
    expect(appPathFor('https://theprivate.in/account/trips/TP-7KX3Q2')).toBe('/journeys/request/TP-7KX3Q2');
    expect(appPathFor('/account/bookings/BK-AB12CD')).toBe('/journeys/booking/BK-AB12CD');
    expect(appPathFor('https://theprivate.in/aircraft-for-sale/falcon-2000lx-2012')).toBe('/explore/aircraft/falcon-2000lx-2012');
    expect(appPathFor('https://theprivate.in/charter?from=x')).toBe('/plan');
    expect(appPathFor('/account/notifications')).toBe('/inbox');
  });
  it('refuses other domains, unknown paths and malformed ids', () => {
    expect(appPathFor('https://evil.example/account/trips/TP-7KX3Q2')).toBeNull();
    expect(appPathFor('https://theprivate.in.evil.example/account')).toBeNull();
    expect(appPathFor('/operator/requests/TP-7KX3Q2')).toBeNull(); // company workspace stays on the web
    expect(appPathFor('/account/trips/../../admin')).toBeNull(); // dot-segments resolve to /admin, which is refused
    expect(appPathFor('/account/trips/<script>')).toBeNull();
    expect(appPathFor('javascript:alert(1)')).toBeNull();
  });
});

describe('flight planner', () => {
  it('blocks identical airports, missing dates and a return before departure', () => {
    expect(planProblems(base)).toEqual([]);
    expect(planProblems({ ...base, to: BOM }).join()).toMatch(/different airports/);
    expect(planProblems({ ...base, date: '' }).join()).toMatch(/departure date/);
    expect(planProblems({ ...base, tripType: 'RETURN', returnDate: '2026-11-30' }).join()).toMatch(/on or after/);
    expect(planProblems({ ...base, passengers: 0 }).join()).toMatch(/between 1 and 400/);
  });
  it('builds exactly the request body the server validates (return = two legs, reversed)', () => {
    const body = toRequestBody({ ...base, tripType: 'RETURN', returnDate: '2026-12-05', time: '09:30', requirements: '  golf bags ' }, { name: ' Asha ', phone: '' });
    expect(body).toEqual({
      tripType: 'RETURN',
      legs: [
        { from: 'a1', to: 'a2', date: '2026-12-01', time: '09:30' },
        { from: 'a2', to: 'a1', date: '2026-12-05', time: '' },
      ],
      passengers: 4,
      category: '',
      requirements: 'golf bags',
      petsOnBoard: false,
      contactName: 'Asha',
      contactPhone: undefined,
    });
  });
});

describe('formatting', () => {
  it('shows a local calendar date as written, regardless of the phone time zone', () => {
    expect(localDate('2026-12-01', { day: 'numeric', month: 'numeric', year: 'numeric' })).toMatch(/1/);
    expect(localDate('2026-12-01', { day: 'numeric' })).toBe('1');
  });
});

describe('API client', () => {
  const realFetch = globalThis.fetch;
  let calls: { url: string; init: RequestInit }[] = [];
  beforeEach(() => {
    calls = [];
  });
  afterEach(async () => {
    globalThis.fetch = realFetch;
    await clearToken();
  });
  const respond = (fn: () => Response | Promise<Response>) => {
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      return fn();
    }) as typeof fetch;
  };

  it('sends the bearer token, never cookies, and unwraps data', async () => {
    await writeToken('tok_123');
    respond(() => Response.json({ data: { ok: 1 } }));
    expect(await api('/api/mobile/v1/me')).toEqual({ ok: 1 });
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer tok_123');
    expect(calls[0]!.init.credentials).toBe('omit');
  });

  it('surfaces the server message and field errors', async () => {
    respond(() => Response.json({ error: { code: 'VALIDATION', message: 'Please check the highlighted fields.', fieldErrors: { 'legs.0.to': 'Arrival must differ' } } }, { status: 400 }));
    await expect(api('/x', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'VALIDATION', status: 400, fieldErrors: { 'legs.0.to': 'Arrival must differ' } });
  });

  it('retries a read once after a dropped connection, but never a commercial action', async () => {
    let n = 0;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      if (n++ === 0) throw new TypeError('network');
      return Response.json({ data: 'ok' });
    }) as typeof fetch;
    expect(await api('/api/mobile/v1/requests')).toBe('ok');
    expect(calls).toHaveLength(2);

    calls = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      throw new TypeError('network');
    }) as typeof fetch;
    const err = await api('/api/mobile/v1/offers/q1/accept', { method: 'POST', body: { revision: 1, confirm: true } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).uncertain).toBe(true); // the UI says "we couldn't confirm", it does not resend
    expect(calls).toHaveLength(1);
  });

  it('clears the session when the server rejects it', async () => {
    await writeToken('expired');
    respond(() => Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } }, { status: 401 }));
    await expect(api('/api/mobile/v1/me')).rejects.toMatchObject({ status: 401 });
    respond(() => Response.json({ data: 1 }));
    await api('/api/mobile/v1/discover');
    expect((calls.at(-1)!.init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
