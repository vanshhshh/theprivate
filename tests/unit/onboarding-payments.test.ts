import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canTransition, type FeeConfig, feeBlockers, matchesSnapshot, quoteFee, taxOf } from '@/domain/payments/onboarding';

process.env.BETTER_AUTH_SECRET ??= 'unit-test-secret-0123456789abcdef';
const { onboardingProvider, signSandbox } = await import('@/server/payments/onboarding/providers');

const cfg = (o: Partial<FeeConfig> = {}): FeeConfig => ({ enabled: true, currency: 'INR', amountMinor: 2_500_000, taxRateBps: 1800, taxLabel: 'GST', refundPolicy: 'Refundable if not approved.', coverage: null, byCountry: {}, ...o });

describe('fee configuration', () => {
  it('collects nothing until enabled with amount, tax treatment and refund policy', () => {
    expect(feeBlockers(cfg({ enabled: false }))).toHaveLength(1);
    expect(feeBlockers(cfg({ amountMinor: null }))).toContain('No fee amount is configured.');
    expect(feeBlockers(cfg({ taxRateBps: null })).join()).toMatch(/tax treatment/);
    expect(feeBlockers(cfg({ refundPolicy: null })).join()).toMatch(/refund policy/);
    expect(quoteFee(cfg({ refundPolicy: null }), 'IN')).toBeNull();
    expect(feeBlockers(cfg({ taxRateBps: 0 }))).toEqual([]); // "no tax" is an explicit decision
  });
  it('computes tax in minor units, rounding half up', () => {
    expect(taxOf(2_500_000, 1800)).toBe(450_000);
    expect(taxOf(333, 1800)).toBe(60); // 59.94 → 60
    expect(taxOf(1, 5000)).toBe(1); // 0.5 → 1
    expect(quoteFee(cfg(), 'IN')).toMatchObject({ feeMinor: 2_500_000, taxMinor: 450_000, totalMinor: 2_950_000, currency: 'INR' });
  });
  it('applies country-specific pricing when configured', () => {
    expect(quoteFee(cfg({ byCountry: { AE: { currency: 'AED', amountMinor: 100_000, taxRateBps: 500, taxLabel: 'VAT' } } }), 'AE')).toMatchObject({ currency: 'AED', totalMinor: 105_000, taxLabel: 'VAT' });
  });
});

describe('payment rules', () => {
  it('only allows legitimate status transitions', () => {
    expect(canTransition('PAYMENT_PENDING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'REFUND_PENDING')).toBe(true);
    expect(canTransition('PAYMENT_FAILED', 'PAID')).toBe(false);
    expect(canTransition('REFUNDED', 'PAID')).toBe(false);
    expect(canTransition('PAYMENT_CANCELLED', 'PAID')).toBe(false);
  });
  it('accepts a confirmation only for the exact snapshot amount and currency', () => {
    expect(matchesSnapshot({ totalMinor: 2_950_000, currency: 'INR' }, { amountMinor: 2_950_000, currency: 'inr' })).toBe(true);
    expect(matchesSnapshot({ totalMinor: 2_950_000, currency: 'INR' }, { amountMinor: 100, currency: 'INR' })).toBe(false);
    expect(matchesSnapshot({ totalMinor: 2_950_000, currency: 'INR' }, { amountMinor: 2_950_000, currency: 'USD' })).toBe(false);
  });
});

describe('webhook signatures', () => {
  it('sandbox: accepts a correctly signed event and rejects a forged one', () => {
    const p = onboardingProvider('sandbox')!;
    const body = JSON.stringify({ id: 'e1', type: 'paid', orderId: 'o1', paymentId: 'p1', amountMinor: 1, currency: 'INR' });
    expect(p.parseWebhook(body, new Headers({ 'x-sandbox-signature': signSandbox(body) }))?.type).toBe('paid');
    expect(() => p.parseWebhook(body, new Headers({ 'x-sandbox-signature': 'f'.repeat(64) }))).toThrow();
    expect(() => p.parseWebhook(body.replace('"amountMinor":1', '"amountMinor":2'), new Headers({ 'x-sandbox-signature': signSandbox(body) }))).toThrow();
  });
  it('razorpay: verifies X-Razorpay-Signature over the raw body', () => {
    Object.assign(process.env, { RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'k', RAZORPAY_WEBHOOK_SECRET: 'whsec' });
    const p = onboardingProvider('razorpay')!;
    const body = JSON.stringify({ event: 'payment_link.paid', payload: { payment_link: { entity: { id: 'plink_1' } }, payment: { entity: { id: 'pay_1', amount: 2_950_000, currency: 'INR' } } } });
    const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
    const e = p.parseWebhook(body, new Headers({ 'x-razorpay-signature': sig, 'x-razorpay-event-id': 'evt_1' }))!;
    expect(e).toMatchObject({ id: 'evt_1', type: 'paid', orderId: 'plink_1', paymentId: 'pay_1', amountMinor: 2_950_000, currency: 'INR' });
    expect(() => p.parseWebhook(body, new Headers({ 'x-razorpay-signature': createHmac('sha256', 'wrong').update(body).digest('hex') }))).toThrow();
  });
});

describe('razorpay standard checkout', () => {
  const env = { RAZORPAY_KEY_ID: 'rzp_test_unit', RAZORPAY_KEY_SECRET: 'unit-key-secret', RAZORPAY_WEBHOOK_SECRET: 'whsec' };
  const sign = (o: string, p: string, secret = env.RAZORPAY_KEY_SECRET) => createHmac('sha256', secret).update(`${o}|${p}`).digest('hex');
  const withFetch = async <T>(impl: (url: string, init?: RequestInit) => unknown, fn: () => Promise<T>) => {
    const real = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const body = impl(String(url), init);
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    try {
      return await fn();
    } finally {
      globalThis.fetch = real;
    }
  };

  it('creates an order (never a payment link) and refuses amounts below the provider minimum', async () => {
    Object.assign(process.env, env);
    const p = onboardingProvider('razorpay')!;
    const calls: string[] = [];
    const r = await withFetch((url, init) => (calls.push(`${init?.method} ${url} ${init?.body}`), { id: 'order_1' }), () =>
      p.createCheckout({ paymentId: 'pay-row-1', amountMinor: 500_000, currency: 'USD', description: 'x', customerEmail: 'a@b.c', customerName: 'A', returnUrl: 'http://x' }),
    );
    expect(r).toEqual({ orderId: 'order_1', checkoutUrl: '/operator/onboarding-payment/checkout/order_1' });
    expect(calls[0]).toMatch(/^POST https:\/\/api\.razorpay\.com\/v1\/orders .*"amount":500000,"currency":"USD","receipt":"pay-row-1"/);
    await expect(p.createCheckout({ paymentId: 'x', amountMinor: 99, currency: 'INR', description: 'x', customerEmail: 'a@b.c', customerName: 'A', returnUrl: 'x' })).rejects.toThrow(/minimum/);
  });

  it('verifies the checkout signature, then trusts only what the API reports', async () => {
    Object.assign(process.env, env);
    const p = onboardingProvider('razorpay')!;
    const api = (status: string, order = 'order_1') => () => ({ id: 'pay_1', order_id: order, status, amount: 500_000, currency: 'USD' });
    const ok = { orderId: 'order_1', paymentId: 'pay_1', signature: sign('order_1', 'pay_1') };
    expect(await withFetch(api('captured'), () => p.verifyCheckout!(ok))).toMatchObject({ type: 'paid', orderId: 'order_1', paymentId: 'pay_1', amountMinor: 500_000, currency: 'USD' });
    expect((await withFetch(api('authorized'), () => p.verifyCheckout!(ok))).type).toBe('processing');
    // Forged or swapped signatures never reach the API.
    let called = false;
    const spy = () => ((called = true), {});
    await expect(withFetch(spy, () => p.verifyCheckout!({ ...ok, signature: sign('order_1', 'pay_1', 'wrong-secret') }))).rejects.toThrow(/signature/);
    await expect(withFetch(spy, () => p.verifyCheckout!({ ...ok, paymentId: 'pay_2' }))).rejects.toThrow(/signature/);
    expect(called).toBe(false);
    // A genuine payment for a different order is refused.
    await expect(withFetch(api('captured', 'order_other'), () => p.verifyCheckout!(ok))).rejects.toThrow(/does not belong/);
  });

  it('maps order.paid webhooks and ignores single failed attempts', () => {
    Object.assign(process.env, env);
    const p = onboardingProvider('razorpay')!;
    const hdr = (b: string) => new Headers({ 'x-razorpay-signature': createHmac('sha256', 'whsec').update(b).digest('hex'), 'x-razorpay-event-id': 'evt_9' });
    const paid = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: 'order_1' } }, payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 500_000, currency: 'USD' } } } });
    expect(p.parseWebhook(paid, hdr(paid))).toMatchObject({ id: 'evt_9', type: 'paid', orderId: 'order_1', paymentId: 'pay_1', amountMinor: 500_000, currency: 'USD' });
    const failed = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_2', order_id: 'order_1' } } } });
    expect(p.parseWebhook(failed, hdr(failed))).toBeNull();
  });

  it('accepts no webhooks without a webhook secret, and refuses test keys on the production deployment', () => {
    Object.assign(process.env, env, { RAZORPAY_WEBHOOK_SECRET: '' });
    expect(() => onboardingProvider('razorpay')!.parseWebhook('{}', new Headers())).toThrow();
    const before = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'production';
    expect(onboardingProvider('razorpay')).toBeNull();
    process.env.RAZORPAY_KEY_ID = 'rzp_live_unit';
    expect(onboardingProvider('razorpay')?.testMode).toBe(false);
    process.env.VERCEL_ENV = before ?? '';
    Object.assign(process.env, env);
    expect(onboardingProvider('razorpay')?.testMode).toBe(true);
  });
});
