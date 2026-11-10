import 'server-only';
import { z } from 'zod';
import { QUOTABLE_AIRCRAFT_WHERE } from '@/domain/charter/eligibility';
import { rfqLifecycle } from '@/domain/lifecycle';
import { AircraftCategory, TripType } from '@/generated/prisma/enums';
import { reference } from '@/lib/ids';
import { localToUtc, todayIso } from '@/lib/time';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma, type Tx } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, operatorMemberIds, staffWith } from '@/server/notifications';
import { getSetting } from '@/server/settings';

const legSchema = z.object({
  from: z.string().min(1, 'Choose a departure airport'),
  to: z.string().min(1, 'Choose an arrival airport'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM').optional().or(z.literal('')),
});

export const rfqSchema = z
  .object({
    tripType: z.enum(TripType),
    legs: z.array(legSchema).min(1).max(6),
    passengers: z.coerce.number().int().min(1, 'At least 1 passenger').max(400),
    category: z.enum(AircraftCategory).optional().or(z.literal('')),
    requirements: z.string().max(2000).optional(),
    petsOnBoard: z.coerce.boolean().optional(),
    contactName: z.string().trim().min(2, 'Enter a contact name').max(120),
    contactPhone: z.string().trim().max(30).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.tripType === 'ONE_WAY' && v.legs.length !== 1) ctx.addIssue({ code: 'custom', path: ['legs'], message: 'A one-way trip has one leg.' });
    if (v.tripType === 'RETURN' && v.legs.length !== 2) ctx.addIssue({ code: 'custom', path: ['legs'], message: 'A return trip has two legs.' });
    v.legs.forEach((l, i) => {
      if (l.from === l.to) ctx.addIssue({ code: 'custom', path: ['legs', i, 'to'], message: 'Arrival must differ from departure.' });
      if (i > 0 && l.date < v.legs[i - 1]!.date) ctx.addIssue({ code: 'custom', path: ['legs', i, 'date'], message: 'Legs must be in date order.' });
    });
  });
export type RfqInput = z.infer<typeof rfqSchema>;

/** Creates the request and routes it to eligible ACTIVE operators. A request is never a booking. */
export async function createRfq(viewer: Viewer, raw: unknown) {
  const input = rfqSchema.parse(raw);
  const airports = await prisma.airport.findMany({ where: { id: { in: input.legs.flatMap((l) => [l.from, l.to]) } } });
  const byId = new Map(airports.map((a) => [a.id, a]));
  input.legs.forEach((l, i) => {
    const dep = byId.get(l.from);
    if (!dep || !byId.get(l.to)) throw new AppError('VALIDATION', 'Unknown airport.', { [`legs.${i}.from`]: 'Unknown airport' });
    if (l.date < todayIso(dep.timezone ?? 'UTC')) throw new AppError('VALIDATION', 'Departure date is in the past.', { [`legs.${i}.date`]: 'Date is in the past' });
  });
  const expiryHours = await getSetting('rfq.expiryHours');
  const firstDeparture = new Date(`${input.legs[0]!.date}T23:59:59Z`);
  const expiresAt = new Date(Math.min(firstDeparture.getTime(), Date.now() + expiryHours * 3_600_000));

  return prisma.$transaction(async (tx) => {
    const rfq = await tx.rfq.create({
      data: {
        reference: reference('TP'),
        customerId: viewer.user.id,
        tripType: input.tripType,
        passengers: input.passengers,
        categoryPreference: input.category || null,
        requirements: input.requirements?.trim() || null,
        petsOnBoard: Boolean(input.petsOnBoard),
        contactName: input.contactName,
        contactPhone: input.contactPhone || null,
        expiresAt,
        legs: {
          create: input.legs.map((l, i) => ({
            sequence: i + 1,
            fromAirportId: l.from,
            toAirportId: l.to,
            departureDate: new Date(`${l.date}T00:00:00Z`),
            departureTimeLocal: l.time || null,
            departureAtUtc: localToUtc(l.date, l.time || null, byId.get(l.from)!.timezone),
            passengers: input.passengers,
          })),
        },
      },
    });
    await audit({ actorUserId: viewer.user.id, action: 'rfq.create', entityType: 'Rfq', entityId: rfq.id, after: { reference: rfq.reference } }, tx);
    await matchRfq(tx, rfq.id);
    await notify({ userIds: [viewer.user.id], type: 'rfq.submitted', title: `Request ${rfq.reference} received`, body: 'We have sent your request to eligible verified operators. This is not a booking yet.', link: `/account/trips/${rfq.reference}` }, tx);
    return rfq;
  });
}

/** Routes an RFQ to every ACTIVE operator with an eligible aircraft. Idempotent per operator. */
async function matchRfq(tx: Tx, rfqId: string) {
  const rfq = await tx.rfq.findUniqueOrThrow({ where: { id: rfqId } });
  rfqLifecycle.assert(rfq.status, 'MATCHING', 'SYSTEM');
  await tx.rfq.update({ where: { id: rfqId }, data: { status: 'MATCHING' } });
  const eligible = await tx.aircraft.groupBy({
    by: ['operatorId'],
    where: { ...QUOTABLE_AIRCRAFT_WHERE, seats: { gte: rfq.passengers }, ...(rfq.categoryPreference ? { aircraftType: { category: rfq.categoryPreference } } : {}) },
    _count: { _all: true },
  });
  for (const e of eligible) {
    await tx.rfqRecipient.create({ data: { rfqId, operatorId: e.operatorId, matchReason: `${e._count._all} eligible aircraft with ≥ ${rfq.passengers} seats` } });
    await notify({ userIds: await operatorMemberIds(e.operatorId, tx), type: 'rfq.received', title: `New request ${rfq.reference}`, body: `${rfq.passengers} passengers. Review and quote.`, link: `/operator/requests/${rfq.reference}` }, tx);
  }
  if (eligible.length > 0) {
    await tx.rfq.update({ where: { id: rfqId }, data: { status: 'AWAITING_QUOTES' } });
  } else {
    // No verified supply matches: stays MATCHING for the operations desk; never invented.
    await notify({ userIds: await staffWith(['OPERATIONS', 'SUPER_ADMIN'], tx), type: 'rfq.unmatched', title: `Request ${rfq.reference} has no eligible operator`, body: 'No active operator has an approved aircraft for this request. Route manually or contact the customer.', link: `/admin/requests/${rfq.reference}` }, tx);
  }
  return eligible.length;
}

/** Staff: route an RFQ to an additional ACTIVE operator that has eligible aircraft. */
export async function routeRfq(viewer: Viewer, rfqId: string, operatorId: string) {
  return prisma.$transaction(async (tx) => {
    const rfq = await tx.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) throw notFound('Request');
    if (!['MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'].includes(rfq.status)) throw new AppError('INVALID_STATE', 'This request is no longer open.');
    const count = await tx.aircraft.count({ where: { ...QUOTABLE_AIRCRAFT_WHERE, operatorId, seats: { gte: rfq.passengers } } });
    if (count === 0) throw new AppError('VALIDATION', 'That operator has no active, approved aircraft with enough seats.');
    await tx.rfqRecipient.create({ data: { rfqId, operatorId, matchReason: `Routed by staff (${count} eligible aircraft)` } });
    if (rfq.status === 'MATCHING') await tx.rfq.update({ where: { id: rfqId }, data: { status: 'AWAITING_QUOTES' } });
    await notify({ userIds: await operatorMemberIds(operatorId, tx), type: 'rfq.received', title: `New request ${rfq.reference}`, body: 'A request was routed to you by ThePrivate operations.', link: `/operator/requests/${rfq.reference}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'rfq.route', entityType: 'Rfq', entityId: rfqId, after: { operatorId } }, tx);
  });
}

export async function cancelRfq(viewer: Viewer, rfqRef: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const rfq = await tx.rfq.findUnique({ where: { reference: rfqRef } });
    if (!rfq || rfq.customerId !== viewer.user.id) throw notFound('Request');
    rfqLifecycle.assert(rfq.status, 'CANCELLED', 'CUSTOMER');
    if (rfq.status === 'ACCEPTED') throw new AppError('INVALID_STATE', 'A quote was accepted: cancel the booking instead.');
    await tx.rfq.update({ where: { id: rfq.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason.slice(0, 500) || null } });
    await tx.quote.updateMany({ where: { rfqId: rfq.id, status: { in: ['SUBMITTED', 'REVISED'] } }, data: { status: 'DECLINED' } });
    const recips = await tx.rfqRecipient.findMany({ where: { rfqId: rfq.id } });
    for (const r of recips) await notify({ userIds: await operatorMemberIds(r.operatorId, tx), type: 'rfq.cancelled', title: `Request ${rfq.reference} cancelled`, body: 'The customer cancelled this request.', link: `/operator/requests/${rfq.reference}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'rfq.cancel', entityType: 'Rfq', entityId: rfq.id, before: { status: rfq.status } }, tx);
  });
}

const legInclude = { orderBy: { sequence: 'asc' as const }, include: { fromAirport: true, toAirport: true } };

export async function listCustomerRfqs(userId: string) {
  return prisma.rfq.findMany({
    where: { customerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { legs: legInclude, booking: { select: { reference: true, status: true } }, _count: { select: { quotes: { where: { status: { in: ['SUBMITTED', 'REVISED'] } } } } } },
    take: 100,
  });
}

export async function getCustomerRfq(userId: string, ref: string) {
  const rfq = await prisma.rfq.findUnique({
    where: { reference: ref },
    include: {
      legs: legInclude,
      booking: { select: { reference: true, status: true } },
      _count: { select: { recipients: true } },
      quotes: {
        orderBy: { createdAt: 'asc' },
        include: {
          operator: { select: { displayName: true, slug: true, isPubliclyListed: true } },
          aircraft: { select: { registration: true, seats: true, yearOfManufacture: true, modelRaw: true, aircraftType: { select: { manufacturer: true, model: true, category: true, rangeNm: true } } } },
          revisions: { orderBy: { revision: 'desc' }, take: 1 },
        },
      },
    },
  });
  if (!rfq || rfq.customerId !== userId) return null;
  // Customer-safe projection: operator payout and platform fee never leave the server.
  const quotes = rfq.quotes.map((q) => {
    const r = q.revisions[0]!;
    return {
      id: q.id,
      status: q.status,
      revision: r.revision,
      validUntil: r.validUntil,
      currency: r.currency,
      customerPrice: r.customerPrice.toString(),
      taxes: r.taxes.toString(),
      inclusions: r.inclusions,
      exclusions: r.exclusions,
      terms: r.terms,
      operator: q.operator,
      aircraft: q.aircraft,
    };
  });
  const { quotes: _omit, ...rest } = rfq;
  return { ...rest, quotes };
}
export type CustomerRfq = NonNullable<Awaited<ReturnType<typeof getCustomerRfq>>>;
