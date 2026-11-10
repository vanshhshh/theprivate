import 'server-only';
import { canTransition, type FeeConfig, feeBlockers, formatMinor, matchesSnapshot, type OnboardingPaymentStatus, quoteFee } from '@/domain/payments/onboarding';
import { Prisma } from '@/generated/prisma/client';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma, type Tx } from '@/server/db/client';
import { enqueueEmail } from '@/server/email/outbox';
import { AppError, notFound } from '@/server/errors';
import { notify, staffWith } from '@/server/notifications';
import { getSetting, setSetting } from '@/server/settings';
import { liveCollectionApproved, onboardingProvider, ProviderError, type ProviderEvent, signSandbox, SignatureError } from './providers';

const appUrl = () => (process.env.PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function feeConfig(tx: Tx | typeof prisma = prisma): Promise<FeeConfig> {
  return getSetting('onboarding.fee', tx);
}

/** What the company sees: whether a fee applies, what it is, and where they stand. */
export async function onboardingPaymentState(operatorId: string) {
  const [op, cfg, payments] = await Promise.all([
    prisma.operator.findUniqueOrThrow({ where: { id: operatorId }, select: { id: true, displayName: true, legalName: true, countryCode: true, lifecycle: true, headquartersAddress: true } }),
    feeConfig(),
    prisma.onboardingPayment.findMany({ where: { operatorId }, orderBy: { createdAt: 'desc' }, include: { events: { orderBy: { createdAt: 'asc' } } } }),
  ]);
  const provider = onboardingProvider();
  const quote = quoteFee(cfg, op.countryCode);
  const blockers = [
    ...feeBlockers(cfg),
    ...(cfg.enabled && !provider ? ['No payment provider is configured.'] : []),
    ...(cfg.enabled && provider && !provider.testMode && !liveCollectionApproved() ? ['Live payment collection has not been approved yet.'] : []),
  ];
  const paid = payments.find((p) => p.status === 'PAID' || p.status === 'REFUND_PENDING');
  const open = payments.find((p) => p.status === 'PAYMENT_PENDING' || p.status === 'PAYMENT_PROCESSING');
  return { operator: op, config: cfg, quote, blockers, required: cfg.enabled, provider: provider?.name ?? null, testMode: provider?.testMode ?? false, paid: paid ?? null, open: open ?? null, history: payments, readyForPayment: op.lifecycle === 'AGREEMENT_SIGNED' };
}

async function addEvent(tx: Tx, paymentId: string, type: string, from: string | null, to: string | null, actorUserId: string | null, detail?: Record<string, unknown>, providerEventId?: string) {
  await tx.onboardingPaymentEvent.create({ data: { paymentId, type, fromStatus: from, toStatus: to, actorUserId, detail: (detail ?? undefined) as never, providerEventId } });
}

async function memberEmails(tx: Tx, operatorId: string) {
  const m = await tx.operatorMembership.findMany({ where: { operatorId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } }, include: { user: { select: { email: true, name: true } } } });
  return m.map((x) => x.user);
}

async function emailMembers(tx: Tx, operatorId: string, key: string, subject: string, body: (name: string) => string) {
  for (const u of await memberEmails(tx, operatorId)) {
    await enqueueEmail(tx, { to: u.email, subject, text: `${body(u.name.split(' ')[0] ?? u.name)}\n\nThePrivate · ${appUrl()}` }, `${key}:${u.email}`);
  }
}

// ---- Checkout ----------------------------------------------------------------------------------

/** Starts (or resumes) the hosted checkout. Amount, currency and tax come only from server config. */
export async function startCheckout(ctx: { viewer: Viewer; operatorId: string }) {
  const provider = onboardingProvider();
  const state = await onboardingPaymentState(ctx.operatorId);
  if (state.blockers.length || !state.quote || !provider) throw new AppError('NOT_CONFIGURED', state.blockers[0] ?? 'Payment is not available yet.');
  if (!state.readyForPayment) throw new AppError('INVALID_STATE', 'The onboarding fee is paid after your agreement is signed.');
  const q = state.quote;
  const result = await prisma.$transaction(async (tx) => {
    // One checkout per company at a time, even with simultaneous clicks.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`onboarding-fee:${ctx.operatorId}`}))`;
    const existing = await tx.onboardingPayment.findMany({ where: { operatorId: ctx.operatorId, status: { in: ['PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAID', 'REFUND_PENDING'] } } });
    if (existing.some((p) => p.status === 'PAID' || p.status === 'REFUND_PENDING')) throw new AppError('CONFLICT', 'The onboarding fee has already been paid.');
    const reusable = existing.find((p) => p.status === 'PAYMENT_PENDING' && p.provider === provider.name && p.totalMinor === q.totalMinor && p.currency === q.currency && p.checkoutUrl);
    if (reusable) return { payment: reusable, created: false };
    for (const stale of existing.filter((p) => p.status === 'PAYMENT_PENDING')) {
      await tx.onboardingPayment.update({ where: { id: stale.id }, data: { status: 'PAYMENT_CANCELLED', failureReason: 'Superseded by a new checkout' } });
      await addEvent(tx, stale.id, 'superseded', 'PAYMENT_PENDING', 'PAYMENT_CANCELLED', ctx.viewer.user.id);
    }
    const payment = await tx.onboardingPayment.create({
      data: { operatorId: ctx.operatorId, provider: provider.name, feeMinor: q.feeMinor, taxMinor: q.taxMinor, totalMinor: q.totalMinor, currency: q.currency, taxLabel: q.taxLabel, taxRateBps: q.taxRateBps, refundPolicy: q.refundPolicy, createdById: ctx.viewer.user.id },
    });
    const checkout = await provider
      .createCheckout({
        paymentId: payment.id,
        amountMinor: q.totalMinor,
        currency: q.currency,
        description: `ThePrivate company onboarding fee — ${state.operator.displayName}`,
        customerEmail: ctx.viewer.user.email,
        customerName: ctx.viewer.user.name,
        returnUrl: `${appUrl()}/operator/onboarding-payment/complete?payment=${payment.id}`,
      })
      .catch((err: unknown) => {
        if (err instanceof ProviderError && err.status === 401) throw new AppError('NOT_CONFIGURED', 'Payments are temporarily unavailable. Our team has been notified.');
        if (err instanceof ProviderError && err.status === 400) throw new AppError('INVALID_STATE', 'The payment provider could not accept this amount or currency. Please contact us.');
        throw err;
      });
    const updated = await tx.onboardingPayment.update({ where: { id: payment.id }, data: { providerOrderId: checkout.orderId, checkoutUrl: checkout.checkoutUrl } });
    await addEvent(tx, payment.id, 'checkout_created', null, 'PAYMENT_PENDING', ctx.viewer.user.id, { provider: provider.name, totalMinor: q.totalMinor, currency: q.currency });
    await audit({ actorUserId: ctx.viewer.user.id, action: 'onboarding_payment.checkout', entityType: 'OnboardingPayment', entityId: payment.id, after: { totalMinor: q.totalMinor, currency: q.currency } }, tx);
    await emailMembers(tx, ctx.operatorId, `onb:${payment.id}:initiated`, 'Your ThePrivate onboarding payment', (n) => `Hello ${n},\n\nA payment of ${formatMinor(q.totalMinor, q.currency)} for ${state.operator.displayName}'s onboarding fee has been started. If you did not start it, you can ignore this e-mail: nothing is charged until the payment is completed.`);
    return { payment: updated, created: true };
  }, { timeout: 30_000 });
  return result.payment;
}

/** What the in-page checkout needs for one of the company's own unpaid orders (never the secret). */
export async function checkoutSession(ctx: { viewer: Viewer; operatorId: string }, orderId: string) {
  const provider = onboardingProvider();
  if (!provider?.keyId || !provider.verifyCheckout) return null;
  const p = await prisma.onboardingPayment.findUnique({
    where: { provider_providerOrderId: { provider: provider.name, providerOrderId: orderId } },
    include: { operator: { select: { displayName: true } } },
  });
  if (!p || p.operatorId !== ctx.operatorId) return null;
  return {
    payment: p,
    keyId: provider.keyId,
    testMode: provider.testMode ?? false,
    customer: { name: ctx.viewer.user.name, email: ctx.viewer.user.email },
  };
}

/**
 * The checkout modal reported success. Trust nothing from the browser: verify the signature, then
 * read the payment from the provider and apply it like any other provider event.
 */
export async function verifyCheckout(ctx: { viewer: Viewer; operatorId: string }, input: { orderId: string; paymentId: string; signature: string }) {
  const provider = onboardingProvider();
  if (!provider?.verifyCheckout) throw new AppError('NOT_CONFIGURED', 'Payment is not available.');
  const p = await prisma.onboardingPayment.findUnique({ where: { provider_providerOrderId: { provider: provider.name, providerOrderId: input.orderId } } });
  if (!p || p.operatorId !== ctx.operatorId) throw notFound('Payment');
  let event: ProviderEvent;
  try {
    event = await provider.verifyCheckout(input);
  } catch (err) {
    if (err instanceof SignatureError) {
      await prisma.onboardingPaymentEvent.create({ data: { paymentId: p.id, type: 'checkout_signature_rejected', fromStatus: p.status, toStatus: p.status, actorUserId: ctx.viewer.user.id } });
      throw new AppError('VALIDATION', 'We could not verify this payment. If you were charged, contact us and we will reconcile it.');
    }
    throw err;
  }
  await applyProviderEvent(provider.name, event);
  const after = await prisma.onboardingPayment.findUniqueOrThrow({ where: { id: p.id }, select: { id: true, status: true } });
  return { paymentId: after.id, status: after.status };
}

/** The customer came back without paying, or chose to cancel. Only an unpaid checkout can be cancelled. */
export async function cancelCheckout(ctx: { viewer: Viewer; operatorId: string }, paymentId: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.onboardingPayment.updateMany({ where: { id: paymentId, operatorId: ctx.operatorId, status: 'PAYMENT_PENDING' }, data: { status: 'PAYMENT_CANCELLED', failureReason: 'Cancelled by the company' } });
    if (res.count) await addEvent(tx, paymentId, 'cancelled_by_user', 'PAYMENT_PENDING', 'PAYMENT_CANCELLED', ctx.viewer.user.id);
  });
}

// ---- Provider events (webhooks, sandbox, reconciliation) --------------------------------------

const TARGET: Record<ProviderEvent['type'], OnboardingPaymentStatus> = { paid: 'PAID', failed: 'PAYMENT_FAILED', cancelled: 'PAYMENT_CANCELLED', refunded: 'REFUNDED', processing: 'PAYMENT_PROCESSING' };

/**
 * Applies one verified provider event. Idempotent: the provider event id is unique, so a repeated
 * webhook records nothing and sends nothing. A confirmation whose amount or currency differs from
 * the snapshot is refused and flagged to staff.
 */
export async function applyProviderEvent(providerName: string, e: ProviderEvent): Promise<{ applied: boolean; reason?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const p = e.orderId
        ? await tx.onboardingPayment.findUnique({ where: { provider_providerOrderId: { provider: providerName, providerOrderId: e.orderId } }, include: { operator: { select: { displayName: true } } } })
        : e.paymentId
          ? await tx.onboardingPayment.findFirst({ where: { provider: providerName, providerPaymentId: e.paymentId }, include: { operator: { select: { displayName: true } } } })
          : null;
      if (!p) return { applied: false, reason: 'unknown payment' };
      const to = TARGET[e.type];
      // Recording the event first makes duplicates fail fast (unique providerEventId).
      await addEvent(tx, p.id, `provider.${e.type}`, p.status, to, null, { amountMinor: e.amountMinor, currency: e.currency, providerPaymentId: e.paymentId }, `${providerName}:${e.id}`);
      if (p.status === to) return { applied: false, reason: 'already in this state' };
      if (e.type === 'paid' && (e.amountMinor == null || !e.currency || !matchesSnapshot(p, { amountMinor: e.amountMinor, currency: e.currency }))) {
        await addEvent(tx, p.id, 'amount_mismatch', p.status, p.status, null, { expected: { totalMinor: p.totalMinor, currency: p.currency }, reported: { amountMinor: e.amountMinor, currency: e.currency } });
        await notify({ userIds: await staffWith(['SUPER_ADMIN'], tx), type: 'onboarding_payment.mismatch', title: 'Onboarding payment needs attention', body: `A payment confirmation for ${p.operator.displayName} did not match the expected amount. It was not accepted.`, link: '/admin/onboarding-payments' }, tx);
        return { applied: false, reason: 'amount or currency mismatch' };
      }
      if (!canTransition(p.status as OnboardingPaymentStatus, to)) {
        await addEvent(tx, p.id, 'ignored_transition', p.status, p.status, null, { attempted: to });
        return { applied: false, reason: `cannot move from ${p.status} to ${to}` };
      }
      const now = new Date();
      await tx.onboardingPayment.update({
        where: { id: p.id },
        data: {
          status: to,
          ...(e.paymentId ? { providerPaymentId: e.paymentId } : {}),
          ...(to === 'PAID' ? { paidAt: now, receiptNumber: `TPO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${p.id.slice(-6).toUpperCase()}`, failureReason: null } : {}),
          ...(to === 'PAYMENT_FAILED' ? { failureReason: 'The payment was declined or failed.' } : {}),
          ...(to === 'REFUNDED' ? { refundedMinor: e.amountMinor ?? p.totalMinor } : {}),
        },
      });
      await audit({ actorUserId: null, action: `onboarding_payment.${to.toLowerCase()}`, entityType: 'OnboardingPayment', entityId: p.id, before: { status: p.status }, after: { status: to, provider: providerName, eventId: e.id } }, tx);
      const total = formatMinor(p.totalMinor, p.currency);
      if (to === 'PAID') {
        await emailMembers(tx, p.operatorId, `onb:${p.id}:paid`, 'Payment received — your onboarding is submitted for review', (n) => `Hello ${n},\n\nWe have received ${total} for ${p.operator.displayName}'s onboarding fee. Your receipt is available in your workspace: ${appUrl()}/operator/onboarding-payment/receipt/${p.id}\n\nYour company profile is now submitted for final review. Payment does not by itself verify or activate the company; we will e-mail you when the review is complete.`);
        await notify({ userIds: await staffWith(['SUPPLY', 'SUPER_ADMIN'], tx), type: 'onboarding_payment.paid', title: 'Onboarding fee paid', body: `${p.operator.displayName} paid the onboarding fee and is ready for final review.`, link: '/admin/onboarding-payments' }, tx);
      }
      if (to === 'PAYMENT_FAILED') await emailMembers(tx, p.operatorId, `onb:${p.id}:failed`, 'Your onboarding payment did not go through', (n) => `Hello ${n},\n\nThe payment of ${total} for ${p.operator.displayName}'s onboarding fee did not go through. Nothing was charged. You can try again from your workspace: ${appUrl()}/operator/onboarding-payment`);
      if (to === 'REFUNDED') await emailMembers(tx, p.operatorId, `onb:${p.id}:refunded`, 'Your onboarding fee has been refunded', (n) => `Hello ${n},\n\nWe have refunded ${formatMinor(e.amountMinor ?? p.totalMinor, p.currency)} to the original payment method for ${p.operator.displayName}. It can take a few working days to appear.`);
      return { applied: true };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { applied: false, reason: 'duplicate event' };
    throw err;
  }
}

/** Entry point for HTTP webhooks: verify signature, then apply. */
export async function handleWebhook(providerName: string, rawBody: string, headers: Headers) {
  const provider = onboardingProvider();
  if (!provider || provider.name !== providerName) return { status: 404, body: { error: 'Provider not configured' } };
  let e: ProviderEvent | null;
  try {
    e = provider.parseWebhook(rawBody, headers);
  } catch (err) {
    if (err instanceof SignatureError || err instanceof SyntaxError) return { status: 401, body: { error: 'Invalid signature' } };
    throw err;
  }
  if (!e) return { status: 200, body: { ignored: true } };
  const r = await applyProviderEvent(provider.name, e);
  return { status: 200, body: r };
}

/** Development only: the sandbox "hosted checkout" posts a signed event through the webhook path. */
export async function completeSandboxCheckout(ctx: { viewer: Viewer; operatorId: string }, orderId: string, outcome: 'paid' | 'failed' | 'cancelled') {
  const provider = onboardingProvider();
  if (provider?.name !== 'sandbox') throw new AppError('NOT_FOUND', 'Not available.');
  const p = await prisma.onboardingPayment.findUnique({ where: { provider_providerOrderId: { provider: 'sandbox', providerOrderId: orderId } } });
  if (!p || p.operatorId !== ctx.operatorId) throw notFound('Payment');
  const body = JSON.stringify({ id: `sbx_evt_${p.id}_${outcome}`, type: outcome, orderId, paymentId: outcome === 'paid' ? `sbx_pay_${p.id}` : null, amountMinor: p.totalMinor, currency: p.currency });
  const headers = new Headers({ 'x-sandbox-signature': signSandbox(body) });
  return handleWebhook('sandbox', body, headers);
}

// ---- Staff: configuration, refunds, reconciliation ---------------------------------------------

function needManage(v: Viewer) {
  if (!v.permissions.has('onboarding_payment.manage')) throw new AppError('FORBIDDEN', 'Not allowed.');
}

export async function saveFeeConfig(viewer: Viewer, value: unknown) {
  needManage(viewer);
  const before = await feeConfig();
  const after = await prisma.$transaction(async (tx) => {
    const v = await setSetting('onboarding.fee', value, viewer.user.id, tx);
    await audit({ actorUserId: viewer.user.id, action: 'onboarding_payment.config', entityType: 'SystemSetting', entityId: 'onboarding.fee', before, after: v }, tx);
    return v;
  });
  return after;
}

export async function refundPayment(viewer: Viewer, paymentId: string, reason: string) {
  needManage(viewer);
  if (reason.trim().length < 5) throw new AppError('VALIDATION', 'Give a reason for the refund.', { reason: 'Required' });
  const p = await prisma.onboardingPayment.findUnique({ where: { id: paymentId } });
  if (!p) throw notFound('Payment');
  if (p.status !== 'PAID' || !p.providerPaymentId) throw new AppError('INVALID_STATE', 'Only a paid onboarding fee can be refunded.');
  const provider = onboardingProvider(p.provider);
  if (!provider) throw new AppError('NOT_CONFIGURED', 'The payment provider for this payment is not configured.');
  const moved = await prisma.$transaction(async (tx) => {
    const res = await tx.onboardingPayment.updateMany({ where: { id: p.id, status: 'PAID' }, data: { status: 'REFUND_PENDING' } });
    if (res.count) {
      await addEvent(tx, p.id, 'refund_requested', 'PAID', 'REFUND_PENDING', viewer.user.id, { reason });
      await audit({ actorUserId: viewer.user.id, action: 'onboarding_payment.refund_request', entityType: 'OnboardingPayment', entityId: p.id, after: { reason, amountMinor: p.totalMinor } }, tx);
    }
    return res.count;
  });
  if (!moved) throw new AppError('INVALID_STATE', 'A refund is already in progress.');
  try {
    const r = await provider.refund({ providerPaymentId: p.providerPaymentId, amountMinor: p.totalMinor, reason });
    if (r.immediate) await applyProviderEvent(p.provider, { id: `refund:${r.refundId}`, type: 'refunded', orderId: p.providerOrderId, paymentId: p.providerPaymentId, amountMinor: p.totalMinor, currency: p.currency });
    return r;
  } catch (err) {
    await prisma.$transaction(async (tx) => {
      await tx.onboardingPayment.update({ where: { id: p.id }, data: { status: 'PAID' } });
      await addEvent(tx, p.id, 'refund_failed', 'REFUND_PENDING', 'PAID', viewer.user.id, { message: String(err).slice(0, 300) });
    });
    throw new AppError('INVALID_STATE', 'The payment provider did not accept the refund. Nothing was refunded.');
  }
}

export async function reconcilePayment(viewer: Viewer, paymentId: string) {
  if (!viewer.permissions.has('onboarding_payment.read')) throw new AppError('FORBIDDEN', 'Not allowed.');
  const p = await prisma.onboardingPayment.findUnique({ where: { id: paymentId } });
  if (!p?.providerOrderId) throw notFound('Payment');
  const provider = onboardingProvider(p.provider);
  if (!provider?.fetchOrder) return { applied: false, reason: 'This provider has nothing to reconcile.' };
  const e = await provider.fetchOrder(p.providerOrderId);
  if (!e) return { applied: false, reason: 'The provider reports no change.' };
  return applyProviderEvent(p.provider, e);
}

/** Activation gate: when a fee applies, the company must have paid it (and not been refunded). */
export async function onboardingFeeSatisfied(tx: Tx, operatorId: string) {
  const cfg = await feeConfig(tx);
  if (!cfg.enabled) return true;
  return (await tx.onboardingPayment.count({ where: { operatorId, status: 'PAID' } })) > 0;
}
