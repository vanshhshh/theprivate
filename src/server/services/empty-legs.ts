import 'server-only';
import { z } from 'zod';
import { isQuotable } from '@/domain/charter/eligibility';
import { emptyLegLifecycle } from '@/domain/lifecycle';
import { computeCustomerPrice } from '@/domain/pricing/pricing';
import { Prisma } from '@/generated/prisma/client';
import { localToUtc } from '@/lib/time';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, operatorMemberIds } from '@/server/notifications';

type OpCtx = { viewer: Viewer; operatorId: string };

export const emptyLegSchema = z
  .object({
    aircraftId: z.string().min(1, 'Choose an aircraft'),
    from: z.string().min(1, 'Choose departure'),
    to: z.string().min(1, 'Choose arrival'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
    earliest: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM'),
    latest: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM'),
    seatsAvailable: z.coerce.number().int().min(1).max(400),
    operatorPrice: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => v.from !== v.to, { path: ['to'], message: 'Must differ from departure' })
  .refine((v) => v.latest > v.earliest, { path: ['latest'], message: 'Must be after earliest' });

/** Only ACTIVE operators can publish, only for their own approved, quotable aircraft. */
export async function publishEmptyLeg(ctx: OpCtx, raw: unknown) {
  const input = emptyLegSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const a = await tx.aircraft.findUnique({ where: { id: input.aircraftId }, include: { operator: true } });
    if (!a || a.operatorId !== ctx.operatorId) throw new AppError('VALIDATION', 'Choose one of your aircraft.', { aircraftId: 'Not in your fleet' });
    if (!isQuotable({ ...a, operatorLifecycle: a.operator.lifecycle })) throw new AppError('VALIDATION', 'Only approved aircraft of an active operator can be listed.', { aircraftId: 'Not approved' });
    if (input.seatsAvailable > (a.seats ?? 0)) throw new AppError('VALIDATION', 'More seats than the aircraft has.', { seatsAvailable: `Max ${a.seats}` });
    const from = await tx.airport.findUnique({ where: { id: input.from } });
    if (!from || !(await tx.airport.findUnique({ where: { id: input.to } }))) throw new AppError('VALIDATION', 'Unknown airport.');
    if (!from.timezone) throw new AppError('VALIDATION', 'The departure airport has no known timezone; choose a nearby airport.', { from: 'Timezone unknown' });
    const windowStartUtc = localToUtc(input.date, input.earliest, from.timezone)!;
    const windowEndUtc = localToUtc(input.date, input.latest, from.timezone)!;
    if (windowStartUtc < new Date()) throw new AppError('VALIDATION', 'The departure window has already started.', { date: 'In the past' });
    let customerPrice: Prisma.Decimal | null = null;
    let currency = 'INR';
    if (input.operatorPrice) {
      const agreement = await tx.agreement.findFirst({ where: { operatorId: ctx.operatorId, status: 'SIGNED' }, orderBy: { version: 'desc' } });
      if (!agreement) throw new AppError('INVALID_STATE', 'A signed agreement is required to price a listing.');
      const b = computeCustomerPrice(input.operatorPrice, { commissionBps: agreement.commissionBps, minimumFee: null }, null);
      customerPrice = new Prisma.Decimal(b.customerPrice);
      currency = agreement.currency;
    }
    emptyLegLifecycle.assert('DRAFT', 'PUBLISHED', 'OPERATOR');
    const leg = await tx.emptyLegListing.create({
      data: { operatorId: ctx.operatorId, aircraftId: a.id, fromAirportId: input.from, toAirportId: input.to, windowStartUtc, windowEndUtc, seatsAvailable: input.seatsAvailable, currency, customerPrice, operatorPrice: input.operatorPrice ? new Prisma.Decimal(input.operatorPrice) : null, status: 'PUBLISHED', publishedAt: new Date(), validUntil: windowStartUtc, notes: input.notes || null },
    });
    await audit({ actorUserId: ctx.viewer.user.id, action: 'emptyleg.publish', entityType: 'EmptyLegListing', entityId: leg.id }, tx);
    return leg;
  });
}

export async function changeEmptyLegStatus(viewer: Viewer, id: string, to: 'WITHDRAWN' | 'SOLD', as: 'OPERATOR' | 'STAFF', operatorId?: string) {
  const leg = await prisma.emptyLegListing.findUnique({ where: { id } });
  if (!leg || (as === 'OPERATOR' && leg.operatorId !== operatorId)) throw notFound('Listing');
  if (as === 'STAFF' && !viewer.permissions.has('emptyleg.moderate')) throw new AppError('FORBIDDEN', 'Not allowed.');
  emptyLegLifecycle.assert(leg.status, to, as);
  await prisma.emptyLegListing.update({ where: { id }, data: { status: to } });
  await audit({ actorUserId: viewer.user.id, action: `emptyleg.${to.toLowerCase()}`, entityType: 'EmptyLegListing', entityId: id });
}

/** Public: only published, unexpired, future listings. Zero results is a valid, honest answer. */
export const LIVE_EMPTY_LEG_WHERE = () => ({ status: 'PUBLISHED' as const, validUntil: { gt: new Date() }, windowEndUtc: { gt: new Date() }, operator: { lifecycle: 'ACTIVE' as const } });

const publicSelect = {
  id: true, windowStartUtc: true, windowEndUtc: true, seatsAvailable: true, currency: true, customerPrice: true, notes: true,
  fromAirport: { select: { icao: true, iata: true, name: true, city: true, countryCode: true, timezone: true, latitude: true, longitude: true } },
  toAirport: { select: { icao: true, iata: true, name: true, city: true, countryCode: true, latitude: true, longitude: true } },
  aircraft: { select: { seats: true, yearOfManufacture: true, aircraftType: { select: { manufacturer: true, model: true, category: true } } } },
  operator: { select: { displayName: true, slug: true, isPubliclyListed: true } },
} as const;

export async function listLiveEmptyLegs(filters: { country?: string; from?: string; after?: string }, page = 1) {
  const where = {
    ...LIVE_EMPTY_LEG_WHERE(),
    ...(filters.country ? { OR: [{ fromAirport: { countryCode: filters.country } }, { toAirport: { countryCode: filters.country } }] } : {}),
    ...(filters.from ? { fromAirportId: filters.from } : {}),
    ...(filters.after ? { windowStartUtc: { gte: new Date(`${filters.after}T00:00:00Z`) } } : {}),
  };
  const [items, total] = await Promise.all([prisma.emptyLegListing.findMany({ where, select: publicSelect, orderBy: { windowStartUtc: 'asc' }, take: 24, skip: (page - 1) * 24 }), prisma.emptyLegListing.count({ where })]);
  return { items, total };
}

export async function getLiveEmptyLeg(id: string) {
  return prisma.emptyLegListing.findFirst({ where: { id, ...LIVE_EMPTY_LEG_WHERE() }, select: publicSelect });
}

export async function enquireEmptyLeg(viewer: Viewer, id: string, raw: { passengers: unknown; message?: unknown }) {
  const input = z.object({ passengers: z.coerce.number().int().min(1).max(400), message: z.string().max(1000).optional() }).parse(raw);
  const leg = await prisma.emptyLegListing.findFirst({ where: { id, ...LIVE_EMPTY_LEG_WHERE() } });
  if (!leg) throw new AppError('INVALID_STATE', 'This empty leg is no longer available.');
  if (input.passengers > leg.seatsAvailable) throw new AppError('VALIDATION', `Only ${leg.seatsAvailable} seats are offered.`, { passengers: `Max ${leg.seatsAvailable}` });
  const dup = await prisma.emptyLegEnquiry.count({ where: { listingId: id, userId: viewer.user.id, status: { in: ['NEW', 'FORWARDED'] } } });
  if (dup) throw new AppError('CONFLICT', 'You already have an open enquiry for this flight.');
  return prisma.$transaction(async (tx) => {
    const e = await tx.emptyLegEnquiry.create({ data: { listingId: id, userId: viewer.user.id, passengers: input.passengers, message: input.message || null } });
    await notify({ userIds: await operatorMemberIds(leg.operatorId, tx), type: 'emptyleg.enquiry', title: 'New empty-leg enquiry', body: `${input.passengers} passenger(s) interested.`, link: '/operator/empty-legs' }, tx);
    await notify({ userIds: [viewer.user.id], type: 'emptyleg.enquiry_sent', title: 'Enquiry sent', body: 'The operator will respond. This is not a booking yet.', link: '/account' }, tx);
    return e;
  });
}

export async function respondEnquiry(ctx: OpCtx, enquiryId: string, status: 'RESPONDED' | 'CONVERTED' | 'CLOSED') {
  const e = await prisma.emptyLegEnquiry.findUnique({ where: { id: enquiryId }, include: { listing: true } });
  if (!e || e.listing.operatorId !== ctx.operatorId) throw notFound('Enquiry');
  await prisma.emptyLegEnquiry.update({ where: { id: enquiryId }, data: { status } });
  await notify({ userIds: [e.userId], type: 'emptyleg.enquiry_update', title: 'Update on your empty-leg enquiry', body: status === 'CLOSED' ? 'The operator closed this enquiry.' : 'The operator responded. Check your e-mail or contact ThePrivate.', link: '/account' });
}
