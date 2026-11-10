/**
 * Company onboarding fee against a real PostgreSQL (*_test database), sandbox provider only.
 * No real payment provider is contacted.
 */
import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

if (existsSync('.env')) process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL!);
if (!url.pathname.endsWith('_test')) url.pathname = `${url.pathname}_test`;
process.env.DATABASE_URL = url.toString();
delete process.env.DATABASE_URL_UNPOOLED;
Object.assign(process.env, { ONBOARDING_PAYMENT_PROVIDER: 'sandbox', SMTP_TRANSPORT: 'capture', BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'test-secret-0123456789abcdef0123' });

let prisma: typeof import('@/server/db/client').prisma;
let svc: typeof import('@/server/payments/onboarding/service');
let providers: typeof import('@/server/payments/onboarding/providers');
let operators: typeof import('@/server/services/operators');
let permissionsFor: typeof import('@/server/auth/permissions').permissionsFor;
type Viewer = Parameters<typeof import('@/server/payments/onboarding/service').saveFeeConfig>[0];

const tag = Date.now().toString(36);
const viewerOf = (user: { id: string; email: string; name: string }, roles: string[] = []) => ({ user, roles, permissions: permissionsFor(roles as never), memberships: [], isStaff: roles.length > 0 }) as unknown as Viewer;
const FEE = { enabled: true, currency: 'INR', amountMinor: 2_500_000, taxRateBps: 1800, taxLabel: 'GST', refundPolicy: 'Refundable in full if ThePrivate does not approve the company.', coverage: 'Review of documents and profile set-up.', byCountry: {} };

async function setup(n: string, lifecycle: 'AGREEMENT_SIGNED' | 'CLAIMED' = 'AGREEMENT_SIGNED') {
  const op = await prisma.operator.create({ data: { slug: `pay-${n}-${tag}`, legalName: `Pay ${n} ${tag}`, displayName: `Pay ${n} ${tag}`, countryCode: 'IN', lifecycle } });
  const user = await prisma.user.create({ data: { email: `owner-${n}-${tag}@pay.example`, name: `Owner ${n}` } });
  await prisma.operatorMembership.create({ data: { operatorId: op.id, userId: user.id, role: 'OWNER', status: 'ACTIVE' } });
  return { op, ctx: { viewer: viewerOf(user), operatorId: op.id } };
}
const signed = (o: Record<string, unknown>) => {
  const body = JSON.stringify(o);
  return { body, headers: new Headers({ 'x-sandbox-signature': providers.signSandbox(body) }) };
};

describe('company onboarding fee (test database, sandbox)', () => {
  let admin: Viewer;
  beforeAll(async () => {
    ({ prisma } = await import('@/server/db/client'));
    svc = await import('@/server/payments/onboarding/service');
    providers = await import('@/server/payments/onboarding/providers');
    operators = await import('@/server/services/operators');
    ({ permissionsFor } = await import('@/server/auth/permissions'));
    admin = viewerOf(await prisma.user.create({ data: { email: `fin-${tag}@t.dev`, name: 'Finance' } }), ['SUPER_ADMIN']);
    const supply = viewerOf(await prisma.user.create({ data: { email: `sup-${tag}@t.dev`, name: 'Supply' } }), ['SUPPLY']);
    await expect(svc.saveFeeConfig(supply, FEE)).rejects.toThrow(/Not allowed/); // finance permission only
    await svc.saveFeeConfig(admin, FEE);
  });

  it('snapshots the server-side amount, reuses an open checkout, and refuses before the agreement', async () => {
    const { ctx } = await setup('a');
    const p1 = await svc.startCheckout(ctx);
    expect(p1).toMatchObject({ feeMinor: 2_500_000, taxMinor: 450_000, totalMinor: 2_950_000, currency: 'INR', status: 'PAYMENT_PENDING' });
    const p2 = await svc.startCheckout(ctx);
    expect(p2.id).toBe(p1.id); // repeated clicks never create a second order
    await svc.saveFeeConfig(admin, { ...FEE, amountMinor: 9_999_900 });
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p1.id } })).totalMinor).toBe(2_950_000); // snapshot unchanged
    await svc.saveFeeConfig(admin, FEE);
    const early = await setup('b', 'CLAIMED');
    await expect(svc.startCheckout(early.ctx)).rejects.toThrow(/after your agreement is signed/);
  });

  it('marks PAID only on a verified event, once, and ignores duplicates', async () => {
    const { op, ctx } = await setup('c');
    const p = await svc.startCheckout(ctx);
    const forged = signed({ id: 'evt-forged', type: 'paid', orderId: p.providerOrderId, paymentId: 'x', amountMinor: p.totalMinor, currency: 'INR' });
    expect((await svc.handleWebhook('sandbox', forged.body, new Headers({ 'x-sandbox-signature': '0'.repeat(64) }))).status).toBe(401);
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('PAYMENT_PENDING');

    const ok = signed({ id: `evt-paid-${tag}`, type: 'paid', orderId: p.providerOrderId, paymentId: `pay-${tag}`, amountMinor: p.totalMinor, currency: 'INR' });
    expect((await svc.handleWebhook('sandbox', ok.body, ok.headers)).body).toEqual({ applied: true });
    const paid = await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id } });
    expect(paid.status).toBe('PAID');
    expect(paid.receiptNumber).toMatch(/^TPO-\d{8}-[A-Z0-9]{6}$/);
    const emails = await prisma.job.count({ where: { type: 'email.send', dedupeKey: { startsWith: `email:onb:${p.id}:paid` } } });
    expect(emails).toBe(1);
    expect((await svc.handleWebhook('sandbox', ok.body, ok.headers)).body).toMatchObject({ applied: false, reason: 'duplicate event' });
    expect(await prisma.job.count({ where: { type: 'email.send', dedupeKey: { startsWith: `email:onb:${p.id}:paid` } } })).toBe(1); // no second receipt
    await expect(svc.startCheckout(ctx)).rejects.toThrow(/already been paid/);
    expect((await prisma.operator.findUniqueOrThrow({ where: { id: op.id } })).lifecycle).toBe('AGREEMENT_SIGNED'); // payment does not activate
  });

  it('refuses a confirmation whose amount or currency differs from the snapshot', async () => {
    const { ctx } = await setup('d');
    const p = await svc.startCheckout(ctx);
    const low = signed({ id: `evt-low-${tag}`, type: 'paid', orderId: p.providerOrderId, paymentId: 'p', amountMinor: 100, currency: 'INR' });
    expect((await svc.handleWebhook('sandbox', low.body, low.headers)).body).toMatchObject({ applied: false, reason: 'amount or currency mismatch' });
    const usd = signed({ id: `evt-usd-${tag}`, type: 'paid', orderId: p.providerOrderId, paymentId: 'p', amountMinor: p.totalMinor, currency: 'USD' });
    expect((await svc.handleWebhook('sandbox', usd.body, usd.headers)).body).toMatchObject({ applied: false });
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('PAYMENT_PENDING');
  });

  it('handles failure, cancellation and retry with a fresh checkout', async () => {
    const { ctx } = await setup('e');
    const p = await svc.startCheckout(ctx);
    await svc.completeSandboxCheckout(ctx, p.providerOrderId!, 'failed');
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('PAYMENT_FAILED');
    const late = signed({ id: `evt-late-${tag}`, type: 'paid', orderId: p.providerOrderId, paymentId: 'p', amountMinor: p.totalMinor, currency: 'INR' });
    expect((await svc.handleWebhook('sandbox', late.body, late.headers)).body).toMatchObject({ applied: false }); // FAILED is final
    const retry = await svc.startCheckout(ctx);
    expect(retry.id).not.toBe(p.id);
    await svc.cancelCheckout(ctx, retry.id);
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: retry.id } })).status).toBe('PAYMENT_CANCELLED');
  });

  it("keeps companies isolated: one company cannot complete or see another's payment", async () => {
    const a = await setup('f');
    const b = await setup('g');
    const pa = await svc.startCheckout(a.ctx);
    await expect(svc.completeSandboxCheckout(b.ctx, pa.providerOrderId!, 'paid')).rejects.toThrow(/not found/i);
    await svc.cancelCheckout(b.ctx, pa.id); // scoped by operator: no effect
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: pa.id } })).status).toBe('PAYMENT_PENDING');
  });

  it('refunds only with the finance permission, and records it', async () => {
    const { ctx } = await setup('h');
    const p = await svc.startCheckout(ctx);
    await svc.completeSandboxCheckout(ctx, p.providerOrderId!, 'paid');
    const ops = viewerOf(await prisma.user.create({ data: { email: `ops-${tag}@t.dev`, name: 'Ops' } }), ['OPERATIONS']);
    await expect(svc.refundPayment(ops, p.id, 'not approved')).rejects.toThrow(/Not allowed/);
    await svc.refundPayment(admin, p.id, 'Company not approved after review');
    const r = await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id }, include: { events: true } });
    expect(r.status).toBe('REFUNDED');
    expect(r.refundedMinor).toBe(p.totalMinor);
    expect(r.events.map((e) => e.type)).toEqual(expect.arrayContaining(['refund_requested', 'provider.refunded']));
    expect(await prisma.auditEvent.count({ where: { entityId: p.id, action: 'onboarding_payment.refund_request' } })).toBe(1);
  });

  it('blocks activation until the fee is paid, and never touches charter payments', async () => {
    const { op, ctx } = await setup('i');
    await prisma.agreement.create({ data: { operatorId: op.id, version: 1, status: 'SIGNED', commissionBps: 800, currency: 'INR' } });
    await expect(operators.changeOperatorLifecycle(admin as never, op.id, 'ACTIVE', 'go')).rejects.toThrow(/onboarding fee has not been paid/);
    const p = await svc.startCheckout(ctx);
    await svc.completeSandboxCheckout(ctx, p.providerOrderId!, 'paid');
    await operators.changeOperatorLifecycle(admin as never, op.id, 'ACTIVE', 'final review complete');
    expect((await prisma.operator.findUniqueOrThrow({ where: { id: op.id } })).lifecycle).toBe('ACTIVE');
    expect(await prisma.payment.count({ where: { provider: 'sandbox' } })).toBe(0); // booking payments untouched
  });

  it('shows NOT_REQUIRED when the fee is switched off', async () => {
    await svc.saveFeeConfig(admin, { ...FEE, enabled: false });
    const { op } = await setup('j');
    const s = await svc.onboardingPaymentState(op.id);
    expect(s.required).toBe(false);
    await svc.saveFeeConfig(admin, FEE);
  });
});

describe('razorpay standard checkout (test database, mocked provider API)', () => {
  const SECRET = 'integration-key-secret';
  const sig = (o: string, p: string) => createHmac('sha256', SECRET).update(`${o}|${p}`).digest('hex');
  let realFetch: typeof fetch;
  let paymentStatus = 'captured';
  let reported = { amount: 0, currency: 'INR' };
  beforeAll(async () => {
    ({ prisma } = await import('@/server/db/client'));
    svc = await import('@/server/payments/onboarding/service');
    ({ permissionsFor } = await import('@/server/auth/permissions'));
    Object.assign(process.env, { ONBOARDING_PAYMENT_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: 'rzp_test_integration', RAZORPAY_KEY_SECRET: SECRET, RAZORPAY_WEBHOOK_SECRET: '' });
    realFetch = globalThis.fetch;
    let n = 0;
    globalThis.fetch = (async (input: string, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.endsWith('/v1/orders') && init?.method === 'POST') return json({ id: `order_${tag}_${++n}` });
      const id = url.match(/\/v1\/payments\/([^/]+)$/)?.[1];
      if (id) return json({ id, order_id: id.replace(/^pay_/, '').replace(/~.*$/, ''), status: paymentStatus, amount: reported.amount, currency: reported.currency });
      throw new Error(`unexpected provider call ${url}`);
    }) as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
    Object.assign(process.env, { ONBOARDING_PAYMENT_PROVIDER: 'sandbox' });
  });

  it('opens an in-page checkout, and marks PAID only after signature and API verification', async () => {
    const { ctx } = await setup('rzp1');
    const p = await svc.startCheckout(ctx);
    expect(p.checkoutUrl).toBe(`/operator/onboarding-payment/checkout/${p.providerOrderId}`);
    const session = await svc.checkoutSession(ctx, p.providerOrderId!);
    expect(session).toMatchObject({ keyId: 'rzp_test_integration', testMode: true });
    expect(JSON.stringify(session)).not.toContain(SECRET); // the secret never leaves the server

    const order = p.providerOrderId!;
    const payId = `pay_${order}`;
    await expect(svc.verifyCheckout(ctx, { orderId: order, paymentId: payId, signature: '0'.repeat(64) })).rejects.toThrow(/could not verify/);
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('PAYMENT_PENDING');

    // A correctly signed response whose API amount differs from the snapshot is refused.
    reported = { amount: p.totalMinor - 1, currency: p.currency };
    const bad = `${payId}~short`;
    await svc.verifyCheckout(ctx, { orderId: order, paymentId: bad, signature: sig(order, bad) });
    expect((await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('PAYMENT_PENDING');

    reported = { amount: p.totalMinor, currency: p.currency };
    paymentStatus = 'captured';
    const ok = await svc.verifyCheckout(ctx, { orderId: order, paymentId: payId, signature: sig(order, payId) });
    expect(ok.status).toBe('PAID');
    const again = await svc.verifyCheckout(ctx, { orderId: order, paymentId: payId, signature: sig(order, payId) });
    expect(again.status).toBe('PAID');
    expect(await prisma.job.count({ where: { type: 'email.send', dedupeKey: { startsWith: `email:onb:${p.id}:paid` } } })).toBe(1);
  });

  it('keeps companies apart: one company cannot verify or open another company\'s order', async () => {
    const a = await setup('rzp2');
    const b = await setup('rzp3');
    const p = await svc.startCheckout(a.ctx);
    const order = p.providerOrderId!;
    expect(await svc.checkoutSession(b.ctx, order)).toBeNull();
    await expect(svc.verifyCheckout(b.ctx, { orderId: order, paymentId: `pay_${order}`, signature: sig(order, `pay_${order}`) })).rejects.toThrow(/not found/i);
  });
});
