import 'server-only';
import { z } from 'zod';
import { isQuotable } from '@/domain/charter/eligibility';
import { quoteLifecycle, rfqLifecycle } from '@/domain/lifecycle';
import { computeCustomerPrice } from '@/domain/pricing/pricing';
import { Prisma } from '@/generated/prisma/client';
import { reference } from '@/lib/ids';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma, type Tx } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, operatorMemberIds } from '@/server/notifications';
import { getSetting } from '@/server/settings';

const lines = z
  .string()
  .max(2000)
  .optional()
  .transform((s) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20));

export const quoteSchema = z.object({
  aircraftId: z.string().min(1, 'Choose an aircraft'),
  operatorPrice: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter an amount, e.g. 450000 or 450000.50'),
  validHours: z.coerce.number().int().min(1).max(24 * 14),
  inclusions: lines,
  exclusions: lines,
  terms: z.string().max(4000).optional(),
});

async function pricingFor(tx: Tx, operatorId: string, departureCountry: string, operatorPrice: string) {
  const agreement = await tx.agreement.findFirst({ where: { operatorId, status: 'SIGNED' }, orderBy: { version: 'desc' } });
  if (!agreement) throw new AppError('INVALID_STATE', 'Your operator has no signed agreement, so quotes cannot be priced.');
  const taxes = await getSetting('tax.charterBps', tx);
  const breakdown = computeCustomerPrice(operatorPrice, { commissionBps: agreement.commissionBps, minimumFee: agreement.minimumFee?.toString() ?? null }, taxes[departureCountry] ?? null);
  return { breakdown, currency: agreement.currency };
}

async function loadRfqForOperator(tx: Tx, rfqRef: string, operatorId: string) {
  const rfq = await tx.rfq.findUnique({ where: { reference: rfqRef }, include: { legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true } }, recipients: { where: { operatorId } } } });
  if (!rfq || rfq.recipients.length === 0) throw notFound('Request');
  return rfq;
}

/** Operator submits a quote. The customer price is computed here, never taken from the form. */
export async function submitQuote(ctx: { viewer: Viewer; operatorId: string }, rfqRef: string, raw: unknown) {
  const input = quoteSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const rfq = await loadRfqForOperator(tx, rfqRef, ctx.operatorId);
    if (!['AWAITING_QUOTES', 'QUOTES_AVAILABLE', 'MATCHING'].includes(rfq.status) || rfq.expiresAt < new Date()) throw new AppError('INVALID_STATE', 'This request is no longer accepting quotes.');
    const aircraft = await tx.aircraft.findUnique({ where: { id: input.aircraftId }, include: { operator: { select: { lifecycle: true } } } });
    if (!aircraft || aircraft.operatorId !== ctx.operatorId) throw new AppError('VALIDATION', 'Choose one of your aircraft.', { aircraftId: 'Not in your fleet' });
    if (!isQuotable({ ...aircraft, operatorLifecycle: aircraft.operator.lifecycle })) throw new AppError('VALIDATION', 'This aircraft is not approved for charter.', { aircraftId: 'Not approved for charter' });
    if ((aircraft.seats ?? 0) < rfq.passengers) throw new AppError('VALIDATION', `This aircraft seats fewer than ${rfq.passengers}.`, { aircraftId: 'Not enough seats' });
    const existing = await tx.quote.findUnique({ where: { rfqId_operatorId_aircraftId: { rfqId: rfq.id, operatorId: ctx.operatorId, aircraftId: aircraft.id } } });
    if (existing) throw new AppError('CONFLICT', 'You already quoted this aircraft: revise the existing quote instead.');
    const { breakdown, currency } = await pricingFor(tx, ctx.operatorId, rfq.legs[0]!.fromAirport.countryCode, input.operatorPrice);
    const validUntil = new Date(Math.min(Date.now() + input.validHours * 3_600_000, rfq.expiresAt.getTime()));
    const quote = await tx.quote.create({
      data: {
        rfqId: rfq.id,
        operatorId: ctx.operatorId,
        aircraftId: aircraft.id,
        validUntil,
        revisions: { create: { revision: 1, currency, ...breakdownData(breakdown), inclusions: input.inclusions, exclusions: input.exclusions, terms: input.terms?.trim() || null, validUntil, createdById: ctx.viewer.user.id } },
      },
    });
    await tx.rfqRecipient.update({ where: { rfqId_operatorId: { rfqId: rfq.id, operatorId: ctx.operatorId } }, data: { status: 'QUOTED' } });
    if (rfq.status !== 'QUOTES_AVAILABLE') {
      if (rfq.status === 'MATCHING') await tx.rfq.update({ where: { id: rfq.id }, data: { status: 'AWAITING_QUOTES' } });
      rfqLifecycle.assert('AWAITING_QUOTES', 'QUOTES_AVAILABLE', 'SYSTEM');
      await tx.rfq.update({ where: { id: rfq.id }, data: { status: 'QUOTES_AVAILABLE' } });
    }
    await notify({ userIds: [rfq.customerId], type: 'quote.received', title: `New quote for ${rfq.reference}`, body: 'An operator has sent you a quote. Compare quotes in your trip.', link: `/account/trips/${rfq.reference}` }, tx);
    await audit({ actorUserId: ctx.viewer.user.id, action: 'quote.submit', entityType: 'Quote', entityId: quote.id, after: { rfq: rfq.reference, customerPrice: breakdown.customerPrice, currency } }, tx);
    return quote;
  });
}

function breakdownData(b: ReturnType<typeof computeCustomerPrice>) {
  return {
    operatorPrice: new Prisma.Decimal(b.operatorPrice),
    platformFee: new Prisma.Decimal(b.platformFee),
    taxes: new Prisma.Decimal(b.taxes),
    customerPrice: new Prisma.Decimal(b.customerPrice),
  };
}

export async function reviseQuote(ctx: { viewer: Viewer; operatorId: string }, quoteId: string, raw: unknown) {
  const input = quoteSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const q = await tx.quote.findUnique({ where: { id: quoteId }, include: { rfq: { include: { legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true } } } } } });
    if (!q || q.operatorId !== ctx.operatorId) throw notFound('Quote');
    quoteLifecycle.assert(q.status, 'REVISED', 'OPERATOR');
    if (q.rfq.status !== 'QUOTES_AVAILABLE') throw new AppError('INVALID_STATE', 'This request is no longer open.');
    const { breakdown, currency } = await pricingFor(tx, ctx.operatorId, q.rfq.legs[0]!.fromAirport.countryCode, input.operatorPrice);
    const validUntil = new Date(Math.min(Date.now() + input.validHours * 3_600_000, q.rfq.expiresAt.getTime()));
    const revision = q.currentRevision + 1;
    // Optimistic concurrency: only succeeds if nobody changed the quote since we read it.
    const updated = await tx.quote.updateMany({ where: { id: q.id, version: q.version }, data: { status: 'REVISED', currentRevision: revision, validUntil, version: { increment: 1 } } });
    if (updated.count !== 1) throw new AppError('CONFLICT', 'The quote changed meanwhile. Reload and try again.');
    await tx.quoteRevision.create({ data: { quoteId: q.id, revision, currency, ...breakdownData(breakdown), inclusions: input.inclusions, exclusions: input.exclusions, terms: input.terms?.trim() || null, validUntil, createdById: ctx.viewer.user.id } });
    await notify({ userIds: [q.rfq.customerId], type: 'quote.revised', title: `Quote updated for ${q.rfq.reference}`, body: 'An operator revised their quote.', link: `/account/trips/${q.rfq.reference}` }, tx);
    await audit({ actorUserId: ctx.viewer.user.id, action: 'quote.revise', entityType: 'Quote', entityId: q.id, after: { revision, customerPrice: breakdown.customerPrice } }, tx);
  });
}

export async function withdrawQuote(ctx: { viewer: Viewer; operatorId: string }, quoteId: string) {
  return prisma.$transaction(async (tx) => {
    const q = await tx.quote.findUnique({ where: { id: quoteId }, include: { rfq: true } });
    if (!q || q.operatorId !== ctx.operatorId) throw notFound('Quote');
    quoteLifecycle.assert(q.status, 'WITHDRAWN', 'OPERATOR');
    await tx.quote.update({ where: { id: q.id }, data: { status: 'WITHDRAWN', version: { increment: 1 } } });
    await notify({ userIds: [q.rfq.customerId], type: 'quote.withdrawn', title: `A quote for ${q.rfq.reference} was withdrawn`, body: 'The operator withdrew their quote.', link: `/account/trips/${q.rfq.reference}` }, tx);
    await audit({ actorUserId: ctx.viewer.user.id, action: 'quote.withdraw', entityType: 'Quote', entityId: q.id }, tx);
  });
}

export async function declineQuote(viewer: Viewer, quoteId: string) {
  return prisma.$transaction(async (tx) => {
    const q = await tx.quote.findUnique({ where: { id: quoteId }, include: { rfq: true } });
    if (!q || q.rfq.customerId !== viewer.user.id) throw notFound('Quote');
    quoteLifecycle.assert(q.status, 'DECLINED', 'CUSTOMER');
    await tx.quote.update({ where: { id: q.id }, data: { status: 'DECLINED', version: { increment: 1 } } });
    await notify({ userIds: await operatorMemberIds(q.operatorId, tx), type: 'quote.declined', title: `Quote declined (${q.rfq.reference})`, body: 'The customer declined your quote.', link: `/operator/requests/${q.rfq.reference}` }, tx);
  });
}

/**
 * Accepting a quote creates a booking PENDING_OPERATOR_CONFIRMATION. Integrity:
 *  - the RFQ row is locked (SELECT … FOR UPDATE) so concurrent accepts serialise;
 *  - Booking.rfqId and Booking.quoteId are UNIQUE, so a second booking cannot exist;
 *  - the customer must accept the exact revision they saw, and it must still be valid.
 */
export async function acceptQuote(viewer: Viewer, quoteId: string, expectedRevision: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const head = await tx.quote.findUnique({ where: { id: quoteId }, select: { rfqId: true } });
      if (!head) throw notFound('Quote');
      await tx.$queryRaw`SELECT id FROM "Rfq" WHERE id = ${head.rfqId} FOR UPDATE`;
      const q = await tx.quote.findUniqueOrThrow({
        where: { id: quoteId },
        include: { rfq: { include: { legs: { orderBy: { sequence: 'asc' } } } }, revisions: { orderBy: { revision: 'desc' }, take: 1 }, aircraft: { include: { operator: { select: { lifecycle: true } } } } },
      });
      if (q.rfq.customerId !== viewer.user.id) throw notFound('Quote');
      const rev = q.revisions[0]!;
      if (rev.revision !== expectedRevision) throw new AppError('CONFLICT', 'This quote was just updated by the operator. Please review the new version.');
      if (q.validUntil <= new Date()) throw new AppError('INVALID_STATE', 'This quote has expired.');
      if (!isQuotable({ ...q.aircraft, operatorLifecycle: q.aircraft.operator.lifecycle })) throw new AppError('INVALID_STATE', 'This aircraft is no longer available for charter.');
      rfqLifecycle.assert(q.rfq.status, 'ACCEPTED', 'CUSTOMER');
      quoteLifecycle.assert(q.status, 'ACCEPTED', 'CUSTOMER');

      const booking = await tx.booking.create({
        data: {
          reference: reference('BK'),
          rfqId: q.rfqId,
          quoteId: q.id,
          quoteRevisionId: rev.id,
          customerId: viewer.user.id,
          operatorId: q.operatorId,
          aircraftId: q.aircraftId,
          currency: rev.currency,
          customerTotal: rev.customerPrice,
          legs: { create: q.rfq.legs.map((l) => ({ sequence: l.sequence, fromAirportId: l.fromAirportId, toAirportId: l.toAirportId, departureDate: l.departureDate, departureTimeLocal: l.departureTimeLocal, departureAtUtc: l.departureAtUtc, passengers: l.passengers })) },
          events: { create: { toStatus: 'PENDING_OPERATOR_CONFIRMATION', actorType: 'USER', actorUserId: viewer.user.id, note: `Accepted quote revision ${rev.revision}` } },
        },
      });
      await tx.quote.update({ where: { id: q.id }, data: { status: 'ACCEPTED', version: { increment: 1 } } });
      await tx.quote.updateMany({ where: { rfqId: q.rfqId, id: { not: q.id }, status: { in: ['SUBMITTED', 'REVISED'] } }, data: { status: 'DECLINED' } });
      await tx.rfq.update({ where: { id: q.rfqId }, data: { status: 'ACCEPTED', version: { increment: 1 } } });
      await notify({ userIds: await operatorMemberIds(q.operatorId, tx), type: 'booking.requested', title: `Quote accepted: ${booking.reference}`, body: 'The customer accepted your quote. Confirm the booking to proceed.', link: `/operator/bookings/${booking.reference}` }, tx);
      await audit({ actorUserId: viewer.user.id, action: 'quote.accept', entityType: 'Booking', entityId: booking.id, after: { quoteId: q.id, revision: rev.revision, total: rev.customerPrice.toString(), currency: rev.currency } }, tx);
      return booking;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AppError('CONFLICT', 'A quote has already been accepted for this request.');
    throw e;
  }
}

/** Operator view: includes the operator's own price components (their data), never other operators'. */
export async function getOperatorRfq(operatorId: string, ref: string) {
  const rfq = await prisma.rfq.findUnique({
    where: { reference: ref },
    include: {
      legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } },
      recipients: { where: { operatorId } },
      quotes: { where: { operatorId }, include: { aircraft: { select: { registration: true } }, revisions: { orderBy: { revision: 'desc' } } } },
    },
  });
  if (!rfq || rfq.recipients.length === 0) return null;
  const { contactPhone: _phone, ...safe } = rfq; // customer contact details stay with ThePrivate until booking
  return safe;
}

export async function markRecipientViewed(operatorId: string, rfqId: string) {
  await prisma.rfqRecipient.updateMany({ where: { rfqId, operatorId, status: 'SENT' }, data: { status: 'VIEWED', viewedAt: new Date() } });
}

export async function declineRfqAsOperator(ctx: { viewer: Viewer; operatorId: string }, rfqRef: string, reason: string) {
  const rfq = await prisma.rfq.findUnique({ where: { reference: rfqRef } });
  if (!rfq) throw notFound('Request');
  const r = await prisma.rfqRecipient.updateMany({ where: { rfqId: rfq.id, operatorId: ctx.operatorId, status: { in: ['SENT', 'VIEWED'] } }, data: { status: 'DECLINED', declineReason: reason.slice(0, 500) } });
  if (r.count !== 1) throw new AppError('INVALID_STATE', 'This request cannot be declined now.');
  await audit({ actorUserId: ctx.viewer.user.id, action: 'rfq.decline', entityType: 'Rfq', entityId: rfq.id, after: { operatorId: ctx.operatorId } });
}
