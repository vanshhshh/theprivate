import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Payment provider boundary for the company onboarding fee. The onboarding flow only talks to
 * this interface, so the gateway can change without touching it. Card data never reaches us:
 * every provider collects it on its own pages or inside its own iframe.
 */

export type ProviderEventType = 'paid' | 'failed' | 'cancelled' | 'refunded' | 'processing';

export interface ProviderEvent {
  /** The provider's unique event id (used for idempotency). */
  id: string;
  type: ProviderEventType;
  orderId: string | null;
  paymentId: string | null;
  amountMinor: number | null;
  currency: string | null;
  raw?: unknown;
}

export interface CheckoutRequest {
  paymentId: string;
  amountMinor: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}

export interface OnboardingPaymentProvider {
  name: 'sandbox' | 'razorpay';
  createCheckout(req: CheckoutRequest): Promise<{ orderId: string; checkoutUrl: string }>;
  /** Throws if the signature is invalid. Returns null for events we do not act on. */
  parseWebhook(rawBody: string, headers: Headers): ProviderEvent | null;
  refund(input: { providerPaymentId: string; amountMinor: number; reason: string }): Promise<{ refundId: string; immediate: boolean }>;
  /** Asks the provider for the current state of an order (reconciliation). */
  fetchOrder?(orderId: string): Promise<ProviderEvent | null>;
  /** In-page checkouts (Razorpay Standard Checkout): verifies the browser's success callback. */
  verifyCheckout?(input: { orderId: string; paymentId: string; signature: string }): Promise<ProviderEvent>;
  /** The public key an in-page checkout needs (never the secret). */
  readonly keyId?: string;
  /** True when the provider moves no real money (sandbox, Razorpay test keys). */
  readonly testMode?: boolean;
}

export class SignatureError extends Error {}

const hmacHex = (secret: string, body: string) => createHmac('sha256', secret).update(body, 'utf8').digest('hex');
function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---- Sandbox: development and tests only -------------------------------------------------------

export function sandboxSecret() {
  const base = process.env.SANDBOX_PAYMENT_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!base) throw new Error('No secret available for the sandbox payment provider');
  return createHmac('sha256', base).update('onboarding-sandbox-webhook').digest('hex');
}

export function signSandbox(body: string) {
  return hmacHex(sandboxSecret(), body);
}

class SandboxProvider implements OnboardingPaymentProvider {
  name = 'sandbox' as const;
  testMode = true;
  async createCheckout(req: CheckoutRequest) {
    const orderId = `sbx_order_${req.paymentId}`;
    return { orderId, checkoutUrl: `/operator/onboarding-payment/sandbox/${encodeURIComponent(orderId)}` };
  }
  parseWebhook(rawBody: string, headers: Headers): ProviderEvent | null {
    const sig = headers.get('x-sandbox-signature') ?? '';
    if (!safeEqualHex(sig, signSandbox(rawBody))) throw new SignatureError('Invalid sandbox signature');
    const e = JSON.parse(rawBody) as ProviderEvent;
    return { id: e.id, type: e.type, orderId: e.orderId, paymentId: e.paymentId, amountMinor: e.amountMinor, currency: e.currency };
  }
  async refund(input: { providerPaymentId: string }) {
    return { refundId: `sbx_rfnd_${input.providerPaymentId}`, immediate: true };
  }
}

// ---- Razorpay: Standard Web Checkout (Orders API + checkout.js modal) --------------------------

/** A provider API failure. `status` is the provider's HTTP status (401 = rejected credentials). */
export class ProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** The smallest charge Razorpay accepts, in minor units (₹1.00 / $1.00). */
export const RAZORPAY_MIN_AMOUNT_MINOR = 100;

type RazorpayPayment = { id: string; order_id: string | null; status: string; amount: number; currency: string };

class RazorpayProvider implements OnboardingPaymentProvider {
  name = 'razorpay' as const;
  constructor(readonly keyId: string, private readonly keySecret: string, private readonly webhookSecret: string | null) {}
  /** Test-mode keys move no real money. */
  get testMode() {
    return this.keyId.startsWith('rzp_test_');
  }
  private auth() {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }
  private async api<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: this.auth(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (res.status === 401) throw new ProviderError('The payment provider rejected our credentials', 401);
    if (!res.ok) throw new ProviderError(`The payment provider returned an error (${res.status})`, res.status);
    return (await res.json()) as T;
  }

  /** Creates a Razorpay Order. The customer pays it in the checkout.js modal on our own page. */
  async createCheckout(req: CheckoutRequest) {
    if (!Number.isInteger(req.amountMinor) || req.amountMinor < RAZORPAY_MIN_AMOUNT_MINOR) throw new ProviderError('The amount is below the minimum the payment provider accepts', 400);
    const order = await this.api<{ id: string }>('POST', '/orders', {
      amount: req.amountMinor,
      currency: req.currency,
      receipt: req.paymentId.slice(0, 40),
      notes: { purpose: 'company-onboarding-fee', paymentId: req.paymentId },
    });
    return { orderId: order.id, checkoutUrl: `/operator/onboarding-payment/checkout/${encodeURIComponent(order.id)}` };
  }

  /**
   * Verifies the checkout handler's response. The signature proves the response came from Razorpay
   * (HMAC-SHA256 of "order_id|payment_id" with the key secret); we then ask Razorpay for the payment
   * itself, so the status, amount and currency we act on never come from the browser.
   */
  async verifyCheckout(input: { orderId: string; paymentId: string; signature: string }): Promise<ProviderEvent> {
    const expected = hmacHex(this.keySecret, `${input.orderId}|${input.paymentId}`);
    if (!safeEqualHex(input.signature, expected)) throw new SignatureError('Invalid Razorpay checkout signature');
    const pay = await this.api<RazorpayPayment>('GET', `/payments/${encodeURIComponent(input.paymentId)}`);
    if (pay.order_id !== input.orderId) throw new SignatureError('The payment does not belong to this order');
    const type: ProviderEventType = pay.status === 'captured' ? 'paid' : pay.status === 'authorized' ? 'processing' : pay.status === 'refunded' ? 'refunded' : 'failed';
    return { id: `checkout:${pay.id}:${pay.status}`, type, orderId: input.orderId, paymentId: pay.id, amountMinor: pay.amount, currency: pay.currency };
  }

  parseWebhook(rawBody: string, headers: Headers): ProviderEvent | null {
    // Webhooks are an optional second confirmation channel; without a secret none are accepted.
    if (!this.webhookSecret) throw new SignatureError('Razorpay webhooks are not configured');
    const sig = headers.get('x-razorpay-signature') ?? '';
    if (!safeEqualHex(sig, hmacHex(this.webhookSecret, rawBody))) throw new SignatureError('Invalid Razorpay signature');
    const eventId = headers.get('x-razorpay-event-id') ?? '';
    const e = JSON.parse(rawBody) as { event: string; payload: Record<string, { entity: Record<string, unknown> }> };
    const pay = e.payload.payment?.entity;
    const order = e.payload.order?.entity;
    const link = e.payload.payment_link?.entity;
    const refund = e.payload.refund?.entity;
    const base = { id: eventId || `${e.event}:${String(pay?.id ?? order?.id ?? link?.id ?? refund?.id)}`, raw: e };
    switch (e.event) {
      case 'order.paid':
        return { ...base, type: 'paid', orderId: String(order?.id ?? pay?.order_id), paymentId: pay ? String(pay.id) : null, amountMinor: pay ? Number(pay.amount) : null, currency: pay ? String(pay.currency) : null };
      // Legacy hosted Payment Links (no longer created, still honoured).
      case 'payment_link.paid':
        return { ...base, type: 'paid', orderId: String(link?.id), paymentId: pay ? String(pay.id) : null, amountMinor: pay ? Number(pay.amount) : null, currency: pay ? String(pay.currency) : null };
      case 'payment_link.cancelled':
      case 'payment_link.expired':
        return { ...base, type: 'cancelled', orderId: String(link?.id), paymentId: null, amountMinor: null, currency: null };
      case 'refund.processed':
        return { ...base, type: 'refunded', orderId: null, paymentId: String(refund?.payment_id), amountMinor: Number(refund?.amount), currency: String(refund?.currency) };
      // payment.failed is deliberately ignored: the customer can retry the same order in the modal,
      // so one declined attempt must not close the order.
      default:
        return null;
    }
  }
  async refund(input: { providerPaymentId: string; amountMinor: number; reason: string }) {
    const body = await this.api<{ id: string }>('POST', `/payments/${encodeURIComponent(input.providerPaymentId)}/refund`, { amount: input.amountMinor, notes: { reason: input.reason.slice(0, 200) } });
    return { refundId: body.id, immediate: false };
  }
  async fetchOrder(orderId: string): Promise<ProviderEvent | null> {
    if (orderId.startsWith('plink_')) {
      const l = await this.api<{ id: string; status: string; amount_paid: number; currency: string; payments?: { payment_id: string; status: string }[] | null }>('GET', `/payment_links/${encodeURIComponent(orderId)}`);
      if (l.status === 'paid') return { id: `reconcile:${l.id}:paid`, type: 'paid', orderId: l.id, paymentId: l.payments?.find((p) => p.status === 'captured')?.payment_id ?? null, amountMinor: l.amount_paid, currency: l.currency };
      if (l.status === 'cancelled' || l.status === 'expired') return { id: `reconcile:${l.id}:${l.status}`, type: 'cancelled', orderId: l.id, paymentId: null, amountMinor: null, currency: null };
      return null;
    }
    const { items } = await this.api<{ items: RazorpayPayment[] }>('GET', `/orders/${encodeURIComponent(orderId)}/payments`);
    const captured = items.find((p) => p.status === 'captured');
    if (captured) return { id: `reconcile:${orderId}:${captured.id}:paid`, type: 'paid', orderId, paymentId: captured.id, amountMinor: captured.amount, currency: captured.currency };
    const authorized = items.find((p) => p.status === 'authorized');
    if (authorized) return { id: `reconcile:${orderId}:${authorized.id}:authorized`, type: 'processing', orderId, paymentId: authorized.id, amountMinor: authorized.amount, currency: authorized.currency };
    return null;
  }
}

/**
 * The configured provider, or null (collection disabled). The sandbox is refused in production
 * builds, so a live site can never mark a fee paid without real money.
 */
export function onboardingProvider(name = process.env.ONBOARDING_PAYMENT_PROVIDER ?? (process.env.NODE_ENV === 'production' ? '' : 'sandbox')): OnboardingPaymentProvider | null {
  if (name === 'sandbox') return process.env.NODE_ENV === 'production' ? null : new SandboxProvider();
  if (name === 'razorpay') {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
    // Test keys are refused on the production deployment (as the sandbox is), so a test-card payment
    // can never mark a real company paid. They work locally and on Vercel preview deployments.
    if (RAZORPAY_KEY_ID.startsWith('rzp_test_') && process.env.VERCEL_ENV === 'production') return null;
    return new RazorpayProvider(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET || null);
  }
  return null;
}

/** Live (real-money) collection additionally needs explicit approval (ONBOARDING_PAYMENTS_LIVE=true). */
export function liveCollectionApproved() {
  return process.env.ONBOARDING_PAYMENTS_LIVE === 'true';
}
