/**
 * Mobile API (/api/mobile/v1) against a real PostgreSQL (*_test database), with real Better Auth
 * sessions presented as bearer tokens, exactly as the app sends them.
 */
import { existsSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL!);
if (!url.pathname.endsWith('_test')) url.pathname = `${url.pathname}_test`;
process.env.DATABASE_URL = url.toString();
delete process.env.DATABASE_URL_UNPOOLED;
Object.assign(process.env, { SMTP_TRANSPORT: 'capture', AUTH_RATE_LIMIT: 'off', BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'test-secret-0123456789abcdef0123', BETTER_AUTH_URL: 'http://localhost:3000' });

let prisma: typeof import('@/server/db/client').prisma;
let auth: typeof import('@/server/auth/auth').auth;
const tag = Date.now().toString(36);
const APP = 'https://localhost';

type R = { status: number; json: { data?: any; error?: { code: string; message: string; fieldErrors?: Record<string, string> } }; headers: Headers };

async function call(path: string, opts: { method?: string; token?: string; body?: unknown; origin?: string } = {}): Promise<R> {
  const [routePath, query] = path.split('?');
  const segments = routePath!.split('/').filter(Boolean);
  // Resolve the route file and dynamic params the way Next.js would.
  const candidates = await import.meta.glob('../../src/app/api/mobile/v1/**/route.ts');
  let match: { file: string; params: Record<string, string> } | null = null;
  for (const file of Object.keys(candidates)) {
    const pattern = file.replace('../../src/app/api/mobile/v1/', '').replace(/\/?route\.ts$/, '').split('/').filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    if (pattern.every((p, i) => (p.startsWith('[') ? ((params[p.slice(1, -1)] = segments[i]!), true) : p === segments[i]))) {
      match = { file, params };
      break;
    }
  }
  if (!match) throw new Error(`No route for ${path}`);
  const mod = (await candidates[match.file]!()) as Record<string, (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>>;
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { origin: opts.origin ?? APP };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const req = new Request(`http://localhost:3000/api/mobile/v1/${routePath}${query ? `?${query}` : ''}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const res = await mod[method]!(req, { params: Promise.resolve(match.params) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {}, headers: res.headers };
}

async function customer(n: string) {
  const email = `m-${n}-${tag}@mobile.example`;
  const r = await auth.api.signUpEmail({ body: { email, password: 'correct-horse-battery', name: `Mobile ${n}` } });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { token: r.token!, user };
}

let bom: { id: string };
let del: { id: string };
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('mobile API (test database, bearer sessions)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/server/db/client'));
    ({ auth } = await import('@/server/auth/auth'));
    if ((await prisma.airport.count({ where: { iata: { in: ['BOM', 'DEL'] } } })) < 2) {
      const { importAirports } = await import('@/server/reference/airports');
      await importAirports();
    }
    bom = await prisma.airport.findFirstOrThrow({ where: { iata: 'BOM' } });
    del = await prisma.airport.findFirstOrThrow({ where: { iata: 'DEL' } });
  }, 300_000);

  it('grants CORS to the app origins only', async () => {
    const mod = await import('@/app/api/mobile/v1/requests/route');
    const ok = mod.OPTIONS(new Request('http://localhost/api/mobile/v1/requests', { method: 'OPTIONS', headers: { origin: 'https://localhost' } }));
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://localhost');
    const ios = mod.OPTIONS(new Request('http://localhost/x', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } }));
    expect(ios.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
    const evil = mod.OPTIONS(new Request('http://localhost/x', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }));
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('requires a valid session for private data, and rejects forged tokens', async () => {
    expect((await call('requests')).status).toBe(401);
    expect((await call('requests', { token: 'not-a-real-session-token' })).status).toBe(401);
    expect((await call('me', { token: `${'x'.repeat(32)}.forged` })).status).toBe(401);
  });

  it('serves public discovery without an account', async () => {
    const a = await call('airports?q=mumbai');
    expect(a.status).toBe(200);
    expect(a.json.data.some((x: { iata: string }) => x.iata === 'BOM')).toBe(true);
    expect(a.headers.get('cache-control')).toContain('public');
    const d = await call('discover');
    expect(d.status).toBe(200);
    expect(d.json.data).toMatchObject({ nextJourney: null, unread: 0 });
    const s = await call(`search?from=${bom.id}&to=${del.id}&date=${future(10)}&pax=4`);
    expect(s.status).toBe(200);
    expect(s.json.data.from.code).toBe('BOM');
    expect(Array.isArray(s.json.data.results)).toBe(true);
    const same = await call(`search?from=${bom.id}&to=${bom.id}&date=${future(10)}&pax=4`);
    expect(same.status).toBe(400);
  });

  it('creates a request with a bearer session and keeps customers isolated', async () => {
    const a = await customer('a');
    const b = await customer('b');
    const bad = await call('requests', { method: 'POST', token: a.token, body: { tripType: 'ONE_WAY', legs: [{ from: bom.id, to: bom.id, date: future(10) }], passengers: 2, contactName: 'Mobile A' } });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.json.error!.fieldErrors ?? {}).join()).toMatch(/legs/);

    const created = await call('requests', { method: 'POST', token: a.token, body: { tripType: 'ONE_WAY', legs: [{ from: bom.id, to: del.id, date: future(12), time: '09:30' }], passengers: 3, contactName: 'Mobile A', requirements: 'Two golf bags' } });
    expect(created.status).toBe(200);
    const ref = created.json.data.reference as string;
    expect(ref).toMatch(/^TP-/);

    const list = await call('requests', { token: a.token });
    expect(list.json.data.map((r: { reference: string }) => r.reference)).toContain(ref);
    expect(list.headers.get('cache-control')).toContain('no-store');

    const detail = await call(`requests/${ref}`, { token: a.token });
    expect(detail.json.data).toMatchObject({ reference: ref, passengers: 3, legs: [{ from: { code: 'BOM' }, to: { code: 'DEL' }, time: '09:30' }] });
    expect(detail.json.data.status.label).toBeTruthy();

    // Another customer cannot see or cancel it.
    expect((await call(`requests/${ref}`, { token: b.token })).status).toBe(404);
    expect((await call(`requests/${ref}/cancel`, { method: 'POST', token: b.token, body: { reason: 'not mine' } })).status).not.toBe(200);
    expect((await call('requests', { token: b.token })).json.data).toEqual([]);
  });

  it('accepts only the reviewed revision, once, and never leaks partner pricing', async () => {
    const c = await customer('c');
    const n = Math.random().toString(36).slice(2, 8);
    const operator = await prisma.operator.create({ data: { slug: `mop-${n}-${tag}`, legalName: `MOp ${n}`, displayName: `MOp ${n}`, countryCode: 'IN', lifecycle: 'ACTIVE' } });
    const aircraft = await prisma.aircraft.create({ data: { registration: `VT-M${n.toUpperCase().replace(/[^A-Z]/g, 'Q').slice(0, 3)}`, operatorId: operator.id, typeResolution: 'ADMIN_SET', seats: 8, evidenceLevel: 'PLATFORM_VERIFIED', reviewStatus: 'APPROVED', charterEligible: true, operationalStatus: 'ACTIVE' } });
    const validUntil = new Date(Date.now() + 3_600_000);
    const rfq = await prisma.rfq.create({
      data: {
        reference: `TP-M${n.toUpperCase()}`, customerId: c.user.id, tripType: 'ONE_WAY', passengers: 4, status: 'QUOTES_AVAILABLE', contactName: 'Mobile C', expiresAt: new Date(Date.now() + 86_400_000),
        legs: { create: { sequence: 1, fromAirportId: bom.id, toAirportId: del.id, departureDate: new Date(Date.now() + 5 * 86_400_000), passengers: 4 } },
      },
    });
    const quote = await prisma.quote.create({
      data: { rfqId: rfq.id, operatorId: operator.id, aircraftId: aircraft.id, validUntil, revisions: { create: { revision: 1, currency: 'INR', operatorPrice: '100000.00', platformFee: '8000.00', taxes: '5400.00', customerPrice: '113400.00', validUntil, createdById: c.user.id } } },
    });

    const detail = await call(`requests/${rfq.reference}`, { token: c.token });
    const offer = detail.json.data.offers[0];
    expect(offer).toMatchObject({ id: quote.id, revision: 1, price: '113400', currency: 'INR', taxes: '5400' });
    const raw = JSON.stringify(detail.json);
    expect(raw).not.toContain('operatorPrice');
    expect(raw).not.toContain('platformFee');
    expect(raw).not.toContain('100000');

    expect((await call(`offers/${quote.id}/accept`, { method: 'POST', token: c.token, body: { revision: 1 } })).status).toBe(400); // explicit confirmation required
    expect((await call(`offers/${quote.id}/accept`, { method: 'POST', token: c.token, body: { revision: 2, confirm: true } })).status).toBe(409); // stale revision
    const ok = await call(`offers/${quote.id}/accept`, { method: 'POST', token: c.token, body: { revision: 1, confirm: true } });
    expect(ok.status).toBe(200);
    const again = await call(`offers/${quote.id}/accept`, { method: 'POST', token: c.token, body: { revision: 1, confirm: true } });
    expect(again.status).not.toBe(200); // a retried acceptance never creates a second booking
    expect(await prisma.booking.count({ where: { rfqId: rfq.id } })).toBe(1);

    const b = await call(`bookings/${ok.json.data.booking}`, { token: c.token });
    expect(b.json.data).toMatchObject({ reference: ok.json.data.booking, status: { value: 'PENDING_OPERATOR_CONFIRMATION' }, price: { amount: '113400', currency: 'INR' } });
    expect(b.json.data.nextStep).toMatch(/Nothing has been charged/);
    expect(JSON.stringify(b.json)).not.toContain('operatorPayout');
    const other = await customer('d');
    expect((await call(`bookings/${ok.json.data.booking}`, { token: other.token })).status).toBe(404);
  });

  it('manages the inbox and profile for the signed-in customer only', async () => {
    const e = await customer('e');
    const f = await customer('f');
    const n = await prisma.notification.create({ data: { userId: e.user.id, type: 'test', title: 'Your journey has an update', body: 'b', link: '/account/trips/TP-X' } });
    const inbox = await call('notifications', { token: e.token });
    expect(inbox.json.data).toMatchObject({ unread: 1, items: [{ id: n.id, read: false, link: '/account/trips/TP-X' }] });
    expect((await call(`notifications/${n.id}/read`, { method: 'POST', token: f.token })).status).toBe(404);
    expect((await call(`notifications/${n.id}/read`, { method: 'POST', token: e.token })).json.data.read).toBe(true);

    const me = await call('me', { token: e.token });
    expect(me.json.data).toMatchObject({ email: e.user.email, name: 'Mobile e' });
    const bad = await call('me', { method: 'PATCH', token: e.token, body: { name: 'E', preferredCurrency: 'INR', timezone: 'Mars/Base' } });
    expect(bad.status).toBe(400);
    const saved = await call('me', { method: 'PATCH', token: e.token, body: { name: 'Eve Mobile', phone: '+91 98200 00000', preferredCurrency: 'AED', timezone: 'Asia/Dubai' } });
    expect(saved.json.data).toMatchObject({ name: 'Eve Mobile', preferredCurrency: 'AED', timezone: 'Asia/Dubai' });
  });

  it('signs out by revoking the session server-side', async () => {
    const g = await customer('g');
    expect((await call('me', { token: g.token })).status).toBe(200);
    await auth.api.signOut({ headers: new Headers({ authorization: `Bearer ${g.token}` }) });
    expect((await call('me', { token: g.token })).status).toBe(401);
  });
});

describe('account recovery and deletion (test database)', () => {
  it('resets a password through the e-mailed link, once, and signs out everywhere', async () => {
    const { captured } = await import('@/server/email/mailer');
    const h = await customer('reset');
    expect((await call('me', { token: h.token })).status).toBe(200);
    const before = captured.length;
    await auth.api.requestPasswordReset({ body: { email: h.user.email, redirectTo: '/reset-password' } });
    const mail = captured.slice(before).find((m) => m.to === h.user.email)!;
    expect(mail.subject).toMatch(/Reset your ThePrivate password/);
    const token = /reset-password\/([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;

    // Unknown addresses get the same (silent) treatment: no e-mail, no error, nothing revealed.
    const n = captured.length;
    await auth.api.requestPasswordReset({ body: { email: `nobody-${tag}@mobile.example`, redirectTo: '/reset-password' } });
    expect(captured.length).toBe(n);

    await auth.api.resetPassword({ body: { newPassword: 'a-brand-new-password', token } });
    expect((await call('me', { token: h.token })).status).toBe(401); // old sessions revoked
    await expect(auth.api.resetPassword({ body: { newPassword: 'another-password-123', token } })).rejects.toThrow(); // single use
    const again = await auth.api.signInEmail({ body: { email: h.user.email, password: 'a-brand-new-password' } });
    expect(again.token).toBeTruthy();
  });

  it('records one deletion request per account, notifies staff and confirms by e-mail', async () => {
    const d = await customer('delete');
    expect((await call('me/deletion', { method: 'POST', token: d.token, body: {} })).status).toBe(400); // explicit confirmation
    const first = await call('me/deletion', { method: 'POST', token: d.token, body: { confirm: true, reason: 'No longer needed' } });
    expect(first.json.data.alreadyRequested).toBe(false);
    const second = await call('me/deletion', { method: 'POST', token: d.token, body: { confirm: true } });
    expect(second.json.data.alreadyRequested).toBe(true);
    expect(await prisma.contactMessage.count({ where: { userId: d.user.id, message: { startsWith: '[ACCOUNT DELETION REQUEST]' } } })).toBe(1);
    expect(await prisma.job.count({ where: { type: 'email.send', dedupeKey: { startsWith: 'email:account-deletion:' }, payload: { path: ['to'], equals: d.user.email } } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { action: 'account.deletion_request', entityId: d.user.id } })).toBe(1);
    expect((await call('me', { token: d.token })).json.data.deletionRequestedAt).toBeTruthy();
    expect((await call('me/deletion', { method: 'POST', body: { confirm: true } })).status).toBe(401);
  });
});

describe('push notifications (test database, simulated FCM)', () => {
  it('registers devices per account, moves a token on account switch, and only the owner can unregister', async () => {
    const x = await customer('px');
    const y = await customer('py');
    const token = `fcm-${tag}-${'x'.repeat(40)}`;
    expect((await call('devices', { method: 'POST', token: x.token, body: { token, platform: 'ANDROID', appVersion: '0.1.0' } })).status).toBe(200);
    const { notify } = await import('@/server/notifications');
    await notify({ userIds: [x.user.id], type: 'rfq.quote_received', title: 'New quote for TP-SECRET', body: 'BOM to DXB, INR 9,00,000', link: '/account/trips/TP-SECRET1' });
    const nx = await prisma.notification.findFirstOrThrow({ where: { userId: x.user.id }, include: { deliveries: true }, orderBy: { createdAt: 'desc' } });
    expect(nx.deliveries.map((d) => d.channel).sort()).toEqual(['EMAIL', 'PUSH']);

    // Same phone signs in as Y: the token moves; X no longer gets pushes on it.
    await call('devices', { method: 'POST', token: y.token, body: { token, platform: 'ANDROID' } });
    expect((await prisma.devicePushToken.findUniqueOrThrow({ where: { token } })).userId).toBe(y.user.id);
    await notify({ userIds: [x.user.id], type: 'booking.confirmed', title: 't', body: 'b' });
    const nx2 = await prisma.notification.findFirstOrThrow({ where: { userId: x.user.id, type: 'booking.confirmed' }, include: { deliveries: true } });
    expect(nx2.deliveries.map((d) => d.channel)).toEqual(['EMAIL']);

    expect((await call('devices', { method: 'DELETE', token: x.token, body: { token } })).json.data.revoked).toBe(0);
    expect((await call('devices', { method: 'DELETE', token: y.token, body: { token } })).json.data.revoked).toBe(1);
  });

  it('sends generic lock-screen text only, revokes dead tokens, and reports "not configured" without credentials', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const { deliverPush } = await import('@/server/push/devices');
    const z = await customer('pz');
    const good = `fcm-good-${tag}-${'g'.repeat(40)}`;
    const dead = `fcm-dead-${tag}-${'d'.repeat(40)}`;
    await call('devices', { method: 'POST', token: z.token, body: { token: good, platform: 'IOS' } });
    await call('devices', { method: 'POST', token: z.token, body: { token: dead, platform: 'ANDROID' } });
    const n = { id: 'n1', userId: z.user.id, type: 'rfq.quote_received', link: '/account/trips/TP-SECRET1' };

    delete process.env.FCM_SERVICE_ACCOUNT;
    expect((await deliverPush(n)).status).toBe('SKIPPED_NOT_CONFIGURED');

    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.FCM_SERVICE_ACCOUNT = Buffer.from(JSON.stringify({ project_id: 'tp-test', client_email: 'push@tp-test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) })).toString('base64');
    const sent: { token: string; notification: { title: string; body: string }; data: Record<string, string> }[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
        expect(String(init.body)).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
        return Response.json({ access_token: 'ya29.test', expires_in: 3600 });
      }
      const m = JSON.parse(String(init.body)).message;
      sent.push(m);
      if (m.token === dead) return Response.json({ error: { status: 'NOT_FOUND', message: 'Requested entity was not found.', details: [{ errorCode: 'UNREGISTERED' }] } }, { status: 404 });
      return Response.json({ name: 'projects/tp-test/messages/1' });
    }) as typeof fetch;
    try {
      const r = await deliverPush(n);
      expect(r.status).toBe('SENT');
    } finally {
      globalThis.fetch = real;
      delete process.env.FCM_SERVICE_ACCOUNT;
    }
    expect(sent).toHaveLength(2);
    for (const m of sent) {
      expect(m.notification).toEqual({ title: 'ThePrivate', body: 'You have a new offer to review.' });
      expect(JSON.stringify(m.notification)).not.toMatch(/TP-|BOM|INR/);
      expect(m.data).toEqual({ notificationId: 'n1', path: '/account/trips/TP-SECRET1' });
    }
    expect((await prisma.devicePushToken.findUniqueOrThrow({ where: { token: dead } })).revokedAt).not.toBeNull();
    expect((await prisma.devicePushToken.findUniqueOrThrow({ where: { token: good } })).revokedAt).toBeNull();
  });
});
