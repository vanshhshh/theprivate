import 'server-only';
import { z } from 'zod';
import { availabilitySignal, QUOTABLE_AIRCRAFT_WHERE, type AvailabilitySignal } from '@/domain/charter/eligibility';
import { indicativePrice } from '@/domain/pricing/pricing';
import { AircraftCategory } from '@/generated/prisma/enums';
import { distanceNm } from '@/lib/geo';
import { localToUtc } from '@/lib/time';
import { prisma } from '@/server/db/client';

export const searchSchema = z.object({
  from: z.string().min(1, 'Choose a departure airport'),
  to: z.string().min(1, 'Choose an arrival airport'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  pax: z.coerce.number().int().min(1, 'At least 1 passenger').max(400),
  category: z.enum(AircraftCategory).optional().or(z.literal('')),
});
export type SearchInput = z.infer<typeof searchSchema>;

export interface SearchResult {
  aircraftId: string;
  registration: string;
  typeLabel: string;
  category: string | null;
  seats: number;
  rangeNm: number | null;
  rangeNote: 'OK' | 'MAY_NEED_STOP' | 'UNVERIFIED';
  operator: { id: string; name: string; slug: string; isPubliclyListed: boolean; authority: string | null };
  homeBase: string | null;
  availability: AvailabilitySignal;
  indicative: { low: string; high: string; currency: string; blockHours: number } | null;
  evidence: string;
}

/**
 * Charter search over VERIFIED supply only (see eligibility.ts). Every signal is labelled:
 * availability is operator-declared and freshness-checked; prices are indicative ranges only
 * when the operator rate, the aircraft's sourced cruise speed and a signed agreement all exist.
 */
export async function searchCharter(input: SearchInput) {
  const [from, to] = await Promise.all([prisma.airport.findUnique({ where: { id: input.from } }), prisma.airport.findUnique({ where: { id: input.to } })]);
  if (!from || !to) return { ok: false as const, error: 'Unknown airport.' };
  if (from.id === to.id) return { ok: false as const, error: 'Departure and arrival must differ.' };
  const nm = distanceNm({ lat: Number(from.latitude), lon: Number(from.longitude) }, { lat: Number(to.latitude), lon: Number(to.longitude) });
  const departAt = localToUtc(input.date, '12:00', from.timezone) ?? new Date(`${input.date}T06:30:00Z`);
  const now = new Date();

  const aircraft = await prisma.aircraft.findMany({
    where: {
      ...QUOTABLE_AIRCRAFT_WHERE,
      seats: { gte: input.pax },
      ...(input.category ? { aircraftType: { category: input.category } } : {}),
    },
    include: {
      aircraftType: true,
      homeBase: { select: { icao: true, iata: true, city: true, name: true } },
      operator: {
        select: {
          id: true, displayName: true, slug: true, isPubliclyListed: true,
          authorizations: { where: { numberStatus: 'VALID' }, select: { authority: true }, take: 1 },
          agreements: { where: { status: 'SIGNED' }, orderBy: { version: 'desc' }, take: 1, select: { commissionBps: true, currency: true } },
        },
      },
      availability: { where: { endsAt: { gte: departAt }, startsAt: { lte: departAt } } },
      pricingRules: { where: { isActive: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] }, orderBy: { validFrom: 'desc' }, take: 1 },
    },
    take: 200,
  });

  const results: SearchResult[] = aircraft.map((a) => {
    const t = a.aircraftType;
    const agreement = a.operator.agreements[0] ?? null;
    const rule = a.pricingRules[0] ?? null;
    const ind =
      rule && agreement && rule.currency === agreement.currency
        ? indicativePrice({ distanceNm: nm, cruiseKtas: t?.cruiseKtas ?? null, hourlyRate: rule.hourlyRate.toString(), minimumBillableHours: Number(rule.minimumBillableHours), commissionBps: agreement.commissionBps })
        : null;
    return {
      aircraftId: a.id,
      registration: a.registration,
      typeLabel: t ? `${t.manufacturer} ${t.model}` : (a.modelRaw ?? 'Aircraft'),
      category: t?.category ?? null,
      seats: a.seats!,
      rangeNm: t?.rangeNm ?? null,
      rangeNote: !t?.rangeNm ? 'UNVERIFIED' : nm > t.rangeNm * 0.9 ? 'MAY_NEED_STOP' : 'OK',
      operator: { id: a.operator.id, name: a.operator.displayName, slug: a.operator.slug, isPubliclyListed: a.operator.isPubliclyListed, authority: a.operator.authorizations[0]?.authority ?? null },
      homeBase: a.homeBase ? `${a.homeBase.city ?? a.homeBase.name} (${a.homeBase.iata ?? a.homeBase.icao})` : null,
      availability: availabilitySignal(a.availability, departAt, now),
      indicative: ind && rule ? { ...ind, currency: rule.currency } : null,
      evidence: a.evidenceLevel,
    };
  });

  const order: Record<AvailabilitySignal, number> = { DECLARED_AVAILABLE: 0, ON_REQUEST: 1, BLOCKED: 2 };
  results.sort((x, y) => order[x.availability] - order[y.availability] || Number(x.indicative?.low ?? Infinity) - Number(y.indicative?.low ?? Infinity) || x.seats - y.seats);
  return { ok: true as const, from, to, distanceNm: Math.round(nm), results: results.filter((r) => r.availability !== 'BLOCKED'), blocked: results.filter((r) => r.availability === 'BLOCKED').length };
}
