import 'server-only';
import { z } from 'zod';
import { aircraftReview } from '@/domain/lifecycle';
import { normalizeRegistration } from '@/domain/imports/normalize';
import { Prisma } from '@/generated/prisma/client';
import { AircraftOperationalStatus, AvailabilityKind } from '@/generated/prisma/enums';
import { audit } from '@/server/audit';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError, notFound } from '@/server/errors';
import { notify, operatorMemberIds, staffWith } from '@/server/notifications';
import { storeUpload } from '@/server/storage';
import { localToUtc } from '@/lib/time';

type OpCtx = { viewer: Viewer; operatorId: string };

export const aircraftSchema = z.object({
  registration: z.string().trim().min(3).max(12),
  aircraftTypeId: z.string().min(1, 'Choose the aircraft type'),
  seats: z.coerce.number().int().min(1, 'Seats are required').max(400),
  yearOfManufacture: z.coerce.number().int().min(1950).max(new Date().getUTCFullYear()).optional().or(z.literal('').transform(() => undefined)),
  serialNumber: z.string().trim().max(40).optional(),
  homeBaseAirportId: z.string().min(1, 'Choose the home base'),
  publicDescription: z.string().trim().max(1500).optional(),
});

/** Fields whose change sends an APPROVED aircraft back to review. */
const MATERIAL = ['aircraftTypeId', 'seats', 'homeBaseAirportId', 'registration'] as const;

async function ownAircraft(ctx: OpCtx, id: string) {
  const a = await prisma.aircraft.findUnique({ where: { id } });
  if (!a || a.operatorId !== ctx.operatorId || a.deletedAt) throw notFound('Aircraft');
  return a;
}

export async function addAircraft(ctx: OpCtx, raw: unknown) {
  const input = aircraftSchema.parse(raw);
  const reg = normalizeRegistration(input.registration);
  if (!reg.value) throw new AppError('VALIDATION', 'Enter a valid registration (e.g. VT-ABC, A6-XYZ).', { registration: 'Invalid registration' });
  const existing = await prisma.aircraft.findUnique({ where: { registration: reg.value } });
  if (existing) {
    throw new AppError('CONFLICT', existing.operatorId === ctx.operatorId ? 'This aircraft is already in your fleet (check imported records and confirm it).' : 'This registration is listed under another operator. Contact ThePrivate support to transfer it.', { registration: 'Already listed' });
  }
  const a = await prisma.aircraft.create({
    data: { registration: reg.value, operatorId: ctx.operatorId, aircraftTypeId: input.aircraftTypeId, typeResolution: 'ADMIN_SET', seats: input.seats, yearOfManufacture: input.yearOfManufacture ?? null, serialNumber: input.serialNumber || null, homeBaseAirportId: input.homeBaseAirportId, publicDescription: input.publicDescription || null, evidenceLevel: 'OPERATOR_CONFIRMED', reviewStatus: 'DRAFT' },
  });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'aircraft.create', entityType: 'Aircraft', entityId: a.id, after: { registration: a.registration } });
  return a;
}

export async function updateAircraft(ctx: OpCtx, id: string, raw: unknown) {
  const a = await ownAircraft(ctx, id);
  const input = aircraftSchema.omit({ registration: true }).parse(raw);
  const data = { aircraftTypeId: input.aircraftTypeId, seats: input.seats, yearOfManufacture: input.yearOfManufacture ?? null, serialNumber: input.serialNumber || null, homeBaseAirportId: input.homeBaseAirportId, publicDescription: input.publicDescription || null };
  const materialChange = MATERIAL.some((k) => k in data && (data as Record<string, unknown>)[k] !== (a as Record<string, unknown>)[k]);
  const backToDraft = materialChange && ['APPROVED', 'REJECTED'].includes(a.reviewStatus);
  if (backToDraft) aircraftReview.assert(a.reviewStatus, 'DRAFT', 'OPERATOR');
  await prisma.aircraft.update({
    where: { id },
    data: { ...data, typeResolution: a.aircraftTypeId === input.aircraftTypeId ? a.typeResolution : 'ADMIN_SET', ...(a.reviewStatus === 'IMPORTED_UNREVIEWED' ? { reviewStatus: 'DRAFT', evidenceLevel: 'OPERATOR_CONFIRMED' } : {}), ...(backToDraft ? { reviewStatus: 'DRAFT', charterEligible: false } : {}) },
  });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'aircraft.update', entityType: 'Aircraft', entityId: id, before: Object.fromEntries(Object.keys(data).map((k) => [k, (a as Record<string, unknown>)[k]])), after: { ...data, backToDraft } });
  return { backToDraft };
}

export async function submitAircraft(ctx: OpCtx, id: string) {
  const a = await ownAircraft(ctx, id);
  if (!a.aircraftTypeId || !a.seats || !a.homeBaseAirportId) throw new AppError('VALIDATION', 'Add type, seats and home base before submitting.');
  aircraftReview.assert(a.reviewStatus, 'SUBMITTED', 'OPERATOR');
  await prisma.aircraft.update({ where: { id }, data: { reviewStatus: 'SUBMITTED' } });
  await notify({ userIds: await staffWith(['SUPPLY', 'SUPER_ADMIN']), type: 'aircraft.submitted', title: `Aircraft ${a.registration} submitted for review`, body: 'Review documents and approve for charter.', link: `/admin/aircraft/${a.id}` });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'aircraft.submit', entityType: 'Aircraft', entityId: id });
}

export async function setOperationalStatus(ctx: OpCtx, id: string, status: string) {
  const s = z.enum(AircraftOperationalStatus).parse(status);
  const a = await ownAircraft(ctx, id);
  await prisma.aircraft.update({ where: { id }, data: { operationalStatus: s } });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'aircraft.operational_status', entityType: 'Aircraft', entityId: id, before: { status: a.operationalStatus }, after: { status: s } });
}

export async function addAircraftImage(ctx: OpCtx, id: string, file: File, alt: string) {
  await ownAircraft(ctx, id);
  const count = await prisma.aircraftImage.count({ where: { aircraftId: id } });
  if (count >= 12) throw new AppError('VALIDATION', 'Up to 12 photos per aircraft.');
  await prisma.$transaction(async (tx) => {
    const doc = await storeUpload(file, { kind: 'AIRCRAFT_PHOTO', uploadedById: ctx.viewer.user.id, allowed: ['image'] }, tx);
    await tx.aircraftImage.create({ data: { aircraftId: id, documentId: doc.id, alt: alt.trim().slice(0, 140) || 'Aircraft photo', sortOrder: count } });
  });
}

export const availabilitySchema = z
  .object({
    kind: z.enum(AvailabilityKind),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an end date'),
    note: z.string().max(300).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: 'End must be on or after start' });

/** Whole-day windows in the aircraft's home-base timezone (UTC if the base is unknown). */
export async function addAvailability(ctx: OpCtx, aircraftId: string, raw: unknown) {
  const a = await ownAircraft(ctx, aircraftId);
  const input = availabilitySchema.parse(raw);
  const base = a.homeBaseAirportId ? await prisma.airport.findUnique({ where: { id: a.homeBaseAirportId } }) : null;
  const tz = base?.timezone ?? 'UTC';
  const startsAt = localToUtc(input.startDate, '00:00', tz)!;
  const endsAt = new Date(localToUtc(input.endDate, '00:00', tz)!.getTime() + 86_400_000 - 1000);
  if (endsAt < new Date()) throw new AppError('VALIDATION', 'Window is in the past.', { endDate: 'In the past' });
  await prisma.aircraftAvailability.create({ data: { aircraftId, kind: input.kind, startsAt, endsAt, baseAirportId: a.homeBaseAirportId, note: input.note || null, createdById: ctx.viewer.user.id } });
}

export async function reconfirmAvailability(ctx: OpCtx, windowId: string) {
  const w = await prisma.aircraftAvailability.findUnique({ where: { id: windowId }, include: { aircraft: true } });
  if (!w || w.aircraft.operatorId !== ctx.operatorId) throw notFound('Availability');
  await prisma.aircraftAvailability.update({ where: { id: windowId }, data: { confirmedAt: new Date() } });
}

export async function deleteAvailability(ctx: OpCtx, windowId: string) {
  const w = await prisma.aircraftAvailability.findUnique({ where: { id: windowId }, include: { aircraft: true } });
  if (!w || w.aircraft.operatorId !== ctx.operatorId) throw notFound('Availability');
  await prisma.aircraftAvailability.delete({ where: { id: windowId } });
}

export const pricingSchema = z.object({
  hourlyRate: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter the hourly rate'),
  minimumBillableHours: z.string().regex(/^\d{1,2}(\.\d{1,2})?$/, 'e.g. 1 or 1.5'),
  currency: z.enum(['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD']),
});

/** Confidential operator rate (one active rule per aircraft); only used for indicative ranges. */
export async function setPricing(ctx: OpCtx, aircraftId: string, raw: unknown) {
  await ownAircraft(ctx, aircraftId);
  const input = pricingSchema.parse(raw);
  await prisma.$transaction(async (tx) => {
    await tx.pricingRule.updateMany({ where: { aircraftId, isActive: true }, data: { isActive: false, validUntil: new Date() } });
    await tx.pricingRule.create({ data: { operatorId: ctx.operatorId, aircraftId, currency: input.currency, hourlyRate: new Prisma.Decimal(input.hourlyRate), minimumBillableHours: new Prisma.Decimal(input.minimumBillableHours), validFrom: new Date() } });
  });
  await audit({ actorUserId: ctx.viewer.user.id, action: 'pricing.set', entityType: 'Aircraft', entityId: aircraftId });
}

// ---- Staff review -------------------------------------------------------------------------

export async function reviewAircraft(viewer: Viewer, id: string, decision: 'APPROVED' | 'REJECTED', opts: { charterEligible: boolean; note: string }) {
  if (!viewer.permissions.has('aircraft.review')) throw new AppError('FORBIDDEN', 'Not allowed.');
  return prisma.$transaction(async (tx) => {
    const a = await tx.aircraft.findUnique({ where: { id } });
    if (!a) throw notFound('Aircraft');
    if (a.reviewStatus === 'SUBMITTED') {
      aircraftReview.assert('SUBMITTED', 'IN_REVIEW', 'STAFF');
    } else if (a.reviewStatus !== 'IN_REVIEW') throw new AppError('INVALID_STATE', 'Only submitted aircraft can be reviewed.');
    if (decision === 'REJECTED' && opts.note.trim().length < 5) throw new AppError('VALIDATION', 'Explain the rejection.', { note: 'Required' });
    if (decision === 'APPROVED' && (!a.aircraftTypeId || !a.seats)) throw new AppError('INVALID_STATE', 'Type and seats are required for approval.');
    await tx.aircraft.update({
      where: { id },
      data: decision === 'APPROVED' ? { reviewStatus: 'APPROVED', charterEligible: opts.charterEligible, evidenceLevel: 'PLATFORM_VERIFIED', attributionUncertain: false, operationalStatus: a.operationalStatus === 'UNKNOWN' ? 'ACTIVE' : a.operationalStatus } : { reviewStatus: 'REJECTED', charterEligible: false },
    });
    if (decision === 'APPROVED') await tx.aircraftImage.updateMany({ where: { aircraftId: id }, data: { isApproved: true } });
    await notify({ userIds: await operatorMemberIds(a.operatorId, tx), type: `aircraft.${decision.toLowerCase()}`, title: `${a.registration} ${decision === 'APPROVED' ? 'approved' : 'needs changes'}`, body: opts.note.trim() || (decision === 'APPROVED' ? 'The aircraft can now be quoted.' : ''), link: `/operator/fleet/${a.id}` }, tx);
    await audit({ actorUserId: viewer.user.id, action: `aircraft.${decision.toLowerCase()}`, entityType: 'Aircraft', entityId: id, before: { reviewStatus: a.reviewStatus }, after: { charterEligible: opts.charterEligible, note: opts.note } }, tx);
  });
}

export async function listFleet(operatorId: string) {
  return prisma.aircraft.findMany({
    where: { operatorId, deletedAt: null },
    include: { aircraftType: true, homeBase: { select: { icao: true, iata: true, city: true } }, _count: { select: { availability: true } } },
    orderBy: [{ reviewStatus: 'asc' }, { registration: 'asc' }],
  });
}

export async function getFleetAircraft(operatorId: string, id: string) {
  const a = await prisma.aircraft.findUnique({
    where: { id },
    include: { aircraftType: true, homeBase: true, images: { include: { document: true }, orderBy: { sortOrder: 'asc' } }, availability: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } }, pricingRules: { where: { isActive: true }, take: 1 } },
  });
  return a && a.operatorId === operatorId && !a.deletedAt ? a : null;
}

export async function aircraftTypeOptions() {
  return prisma.aircraftType.findMany({ orderBy: [{ manufacturer: 'asc' }, { model: 'asc' }], select: { id: true, manufacturer: true, model: true, category: true } });
}
