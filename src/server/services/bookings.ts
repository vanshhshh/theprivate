import 'server-only';
import { z } from 'zod';
import { bookingLifecycle, type Actor } from '@/domain/lifecycle';
import type { BookingStatus } from '@/generated/prisma/enums';
import { Prisma } from '@/generated/prisma/client';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma, type Tx } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, operatorMemberIds } from '@/server/notifications';
import { getSetting } from '@/server/settings';

async function transition(tx: Tx, bookingId: string, to: BookingStatus, actor: Actor, actorUserId: string | null, note?: string) {
  const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  bookingLifecycle.assert(b.status, to, actor);
  const updated = await tx.booking.updateMany({ where: { id: b.id, version: b.version }, data: { status: to, version: { increment: 1 }, ...(to === 'CANCELLED' ? { cancelledAt: new Date(), cancelReason: note ?? null } : {}) } });
  if (updated.count !== 1) throw new AppError('CONFLICT', 'The booking changed meanwhile. Reload and try again.');
  await tx.bookingEvent.create({ data: { bookingId: b.id, fromStatus: b.status, toStatus: to, actorType: actor === 'PAYMENT' ? 'WEBHOOK' : actorUserId ? 'USER' : 'SYSTEM', actorUserId, note } });
  return b;
}

/** Operator confirms the booking. In pre-payment mode it then awaits offline settlement. */
export async function confirmBooking(ctx: { viewer: Viewer; operatorId: string }, ref: string) {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { reference: ref } });
    if (!b || b.operatorId !== ctx.operatorId) throw notFound('Booking');
    await transition(tx, b.id, 'CONFIRMED', 'OPERATOR', ctx.viewer.user.id, 'Confirmed by operator');
    await tx.rfq.update({ where: { id: b.rfqId }, data: { status: 'BOOKED' } });
    const mode = await getSetting('payments.mode', tx);
    if (mode === 'pre-payment') await transition(tx, b.id, 'PAYMENT_PENDING', 'SYSTEM', null, 'Pre-payment mode: settlement is arranged offline and recorded by ThePrivate with evidence.');
    await notify({ userIds: [b.customerId], type: 'booking.confirmed', title: `Booking ${b.reference} confirmed by the operator`, body: 'Our team will contact you to arrange payment. Your booking is not paid yet.', link: `/account/bookings/${b.reference}` }, tx);
    await audit({ actorUserId: ctx.viewer.user.id, action: 'booking.confirm', entityType: 'Booking', entityId: b.id }, tx);
  });
}

export async function cancelBooking(viewer: Viewer, ref: string, reason: string, as: 'CUSTOMER' | 'OPERATOR' | 'STAFF', operatorId?: string) {
  if (reason.trim().length < 3) throw new AppError('VALIDATION', 'Please give a reason.', { reason: 'Required' });
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { reference: ref } });
    if (!b) throw notFound('Booking');
    if (as === 'CUSTOMER' && b.customerId !== viewer.user.id) throw notFound('Booking');
    if (as === 'OPERATOR' && b.operatorId !== operatorId) throw notFound('Booking');
    if (as === 'STAFF' && !viewer.permissions.has('booking.manage')) throw new AppError('FORBIDDEN', 'Not allowed.');
    await transition(tx, b.id, 'CANCELLED', as, viewer.user.id, reason.trim().slice(0, 500));
    await tx.rfq.update({ where: { id: b.rfqId }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: `Booking cancelled: ${reason.slice(0, 400)}` } });
    await tx.quote.update({ where: { id: b.quoteId }, data: { status: 'WITHDRAWN' } });
    const recipients = [b.customerId, ...(await operatorMemberIds(b.operatorId, tx))].filter((id) => id !== viewer.user.id);
    await notify({ userIds: recipients, type: 'booking.cancelled', title: `Booking ${b.reference} cancelled`, body: reason.slice(0, 200), link: `/account/bookings/${b.reference}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'booking.cancel', entityType: 'Booking', entityId: b.id, after: { as, reason } }, tx);
  });
}

export const settlementSchema = z.object({
  amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter the amount received'),
  providerRef: z.string().trim().min(3, 'Enter the bank/UTR or receipt reference').max(120),
  evidenceNote: z.string().trim().min(10, 'Describe how the settlement was verified').max(1000),
});

/**
 * Pre-payment mode: a staff member with payment.record_offline records a VERIFIED settlement
 * (amount must equal the booking total; reference + evidence required; audited). This is the
 * "verified payment process" path: the only non-webhook way a booking can become PAID.
 */
export async function recordOfflineSettlement(viewer: Viewer, ref: string, raw: unknown) {
  if (!viewer.permissions.has('payment.record_offline')) throw new AppError('FORBIDDEN', 'Not allowed.');
  const input = settlementSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { reference: ref } });
    if (!b) throw notFound('Booking');
    if (!new Prisma.Decimal(input.amount).equals(b.customerTotal)) throw new AppError('VALIDATION', `Amount must equal the booking total (${b.customerTotal.toString()} ${b.currency}). Record partial payments outside the booking.`, { amount: 'Must equal total' });
    try {
      await tx.payment.create({ data: { bookingId: b.id, provider: 'offline', providerRef: input.providerRef, status: 'SETTLED', amount: b.customerTotal, currency: b.currency, evidenceNote: input.evidenceNote, settledAt: new Date() } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AppError('CONFLICT', 'That payment reference was already recorded.');
      throw e;
    }
    await transition(tx, b.id, 'PAID', 'PAYMENT', viewer.user.id, `Offline settlement ${input.providerRef} recorded by staff`);
    await notify({ userIds: [b.customerId, ...(await operatorMemberIds(b.operatorId, tx))], type: 'booking.paid', title: `Payment received for ${b.reference}`, body: 'Settlement has been verified.', link: `/account/bookings/${b.reference}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'payment.offline_settlement', entityType: 'Booking', entityId: b.id, after: { providerRef: input.providerRef, amount: input.amount } }, tx);
  });
}

export async function progressBooking(ctx: { viewer: Viewer; operatorId: string }, ref: string, to: 'IN_PROGRESS' | 'COMPLETED') {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { reference: ref } });
    if (!b || b.operatorId !== ctx.operatorId) throw notFound('Booking');
    await transition(tx, b.id, to, 'OPERATOR', ctx.viewer.user.id);
    await audit({ actorUserId: ctx.viewer.user.id, action: `booking.${to.toLowerCase()}`, entityType: 'Booking', entityId: b.id }, tx);
    if (to === 'COMPLETED') await notify({ userIds: [b.customerId], type: 'booking.completed', title: `Trip ${b.reference} completed`, body: 'Thank you for flying with ThePrivate.', link: `/account/bookings/${b.reference}` }, tx);
  });
}

const bookingInclude = {
  legs: { orderBy: { sequence: 'asc' as const }, include: { fromAirport: true, toAirport: true } },
  events: { orderBy: { createdAt: 'asc' as const } },
  aircraft: { select: { registration: true, seats: true, modelRaw: true, aircraftType: { select: { manufacturer: true, model: true } } } },
  operator: { select: { displayName: true, slug: true } },
  quoteRevision: { select: { revision: true, inclusions: true, exclusions: true, terms: true, taxes: true, customerPrice: true, currency: true } },
  payments: { select: { provider: true, status: true, amount: true, currency: true, settledAt: true } },
  rfq: { select: { reference: true, contactName: true, contactPhone: true, requirements: true, passengers: true } },
};

export async function getCustomerBooking(userId: string, ref: string) {
  const b = await prisma.booking.findUnique({ where: { reference: ref }, include: bookingInclude });
  return b && b.customerId === userId ? b : null;
}

export async function getOperatorBooking(operatorId: string, ref: string) {
  const b = await prisma.booking.findUnique({ where: { reference: ref }, include: { ...bookingInclude, quoteRevision: { select: { revision: true, inclusions: true, exclusions: true, terms: true, operatorPrice: true, currency: true } }, customer: { select: { name: true, email: true } } } });
  return b && b.operatorId === operatorId ? b : null;
}
