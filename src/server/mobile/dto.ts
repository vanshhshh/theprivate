import 'server-only';
import { NEXT_STEP } from '@/components/domain/journey-copy';
import { categoryLabel, statusInfo } from '@/components/domain/status';
import type { listCustomerRfqs } from '@/server/services/rfq';
import type { CustomerRfq } from '@/server/services/rfq';
import type { getCustomerBooking } from '@/server/services/bookings';
import type { getLiveEmptyLeg } from '@/server/services/empty-legs';
import type { getPublishedListing } from '@/server/services/sales';
import type { AirportOption } from '@/server/services/airports';

/**
 * Customer-safe projections for the mobile app. Explicit allow-lists: a field reaches the phone
 * only if it is named here. Money is sent as decimal strings with its currency; labels come from
 * the website's own customer copy so web and app always say the same thing.
 */

type AirportLike = { id?: string; icao: string | null; iata: string | null; name: string; city: string | null; countryCode: string; timezone?: string | null };

export function airport(a: AirportLike) {
  return { id: a.id ?? null, code: a.iata ?? a.icao ?? '', icao: a.icao, iata: a.iata, name: a.name, city: a.city, country: a.countryCode, timezone: a.timezone ?? null };
}

export function airportOption(a: AirportOption) {
  return { ...airport(a), kind: a.kind };
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const day = (d: Date) => d.toISOString().slice(0, 10);

type RfqRow = Awaited<ReturnType<typeof listCustomerRfqs>>[number];

export function requestSummary(r: RfqRow) {
  return {
    reference: r.reference,
    status: statusInfo('rfq', r.status, 'customer'),
    tripType: r.tripType,
    passengers: r.passengers,
    legs: r.legs.map((l) => ({ from: airport(l.fromAirport), to: airport(l.toAirport), date: day(l.departureDate), time: l.departureTimeLocal ?? null })),
    openOffers: r._count.quotes,
    booking: r.booking ? { reference: r.booking.reference, status: statusInfo('booking', r.booking.status, 'customer') } : null,
    createdAt: iso(r.createdAt),
    expiresAt: iso(r.expiresAt),
  };
}

export function requestDetail(r: CustomerRfq) {
  return {
    reference: r.reference,
    status: statusInfo('rfq', r.status, 'customer'),
    tripType: r.tripType,
    passengers: r.passengers,
    category: r.categoryPreference ? { value: r.categoryPreference, label: categoryLabel(r.categoryPreference) } : null,
    requirements: r.requirements,
    petsOnBoard: r.petsOnBoard,
    legs: r.legs.map((l) => ({ from: airport(l.fromAirport), to: airport(l.toAirport), date: day(l.departureDate), time: l.departureTimeLocal ?? null })),
    partnersContacted: r._count.recipients,
    booking: r.booking ? { reference: r.booking.reference, status: statusInfo('booking', r.booking.status, 'customer') } : null,
    createdAt: iso(r.createdAt),
    expiresAt: iso(r.expiresAt),
    offers: r.quotes.map((q) => {
      const t = q.aircraft.aircraftType;
      return {
        id: q.id,
        status: statusInfo('quote', q.status, 'customer'),
        revision: q.revision,
        validUntil: iso(q.validUntil),
        currency: q.currency,
        price: q.customerPrice,
        taxes: q.taxes,
        inclusions: q.inclusions,
        exclusions: q.exclusions,
        terms: q.terms,
        partner: { name: q.operator.displayName, slug: q.operator.isPubliclyListed ? q.operator.slug : null },
        aircraft: {
          type: t ? `${t.manufacturer} ${t.model}` : (q.aircraft.modelRaw ?? 'Aircraft'),
          category: t?.category ? { value: t.category, label: categoryLabel(t.category) } : null,
          seats: q.aircraft.seats,
          year: q.aircraft.yearOfManufacture,
          rangeNm: t?.rangeNm ?? null,
        },
      };
    }),
  };
}

type BookingRow = NonNullable<Awaited<ReturnType<typeof getCustomerBooking>>>;

export function booking(b: BookingRow) {
  const t = b.aircraft.aircraftType;
  const rev = b.quoteRevision;
  return {
    reference: b.reference,
    request: b.rfq.reference,
    status: statusInfo('booking', b.status, 'customer'),
    nextStep: NEXT_STEP[b.status] ?? null,
    passengers: b.rfq.passengers,
    contactName: b.rfq.contactName,
    requirements: b.rfq.requirements,
    partner: { name: b.operator.displayName },
    aircraft: { type: t ? `${t.manufacturer} ${t.model}` : (b.aircraft.modelRaw ?? 'Aircraft'), seats: b.aircraft.seats, registration: b.aircraft.registration },
    legs: b.legs.map((l) => ({ from: airport(l.fromAirport), to: airport(l.toAirport), date: day(l.departureDate), time: l.departureTimeLocal ?? null })),
    price: rev ? { amount: rev.customerPrice.toString(), taxes: rev.taxes.toString(), currency: rev.currency, inclusions: rev.inclusions, exclusions: rev.exclusions, terms: rev.terms } : null,
    // Payment state exactly as recorded; PAID is only ever set by a verified provider event or audited settlement.
    payments: b.payments.map((p) => ({ status: p.status, amount: p.amount.toString(), currency: p.currency, settledAt: iso(p.settledAt) })),
    timeline: b.events.map((e) => ({ status: statusInfo('booking', e.toStatus, 'customer'), at: iso(e.createdAt) })),
  };
}

type LegRow = NonNullable<Awaited<ReturnType<typeof getLiveEmptyLeg>>>;

export function oneWay(l: LegRow) {
  const t = l.aircraft.aircraftType;
  return {
    id: l.id,
    from: airport(l.fromAirport),
    to: airport(l.toAirport),
    windowStart: iso(l.windowStartUtc),
    windowEnd: iso(l.windowEndUtc),
    seats: l.seatsAvailable,
    price: l.customerPrice ? { amount: l.customerPrice.toString(), currency: l.currency } : null,
    notes: l.notes,
    aircraft: { type: t ? `${t.manufacturer} ${t.model}` : 'Aircraft', category: t?.category ? { value: t.category, label: categoryLabel(t.category) } : null, seats: l.aircraft.seats, year: l.aircraft.yearOfManufacture },
    partner: { name: l.operator.displayName },
    webUrl: `/empty-legs/${l.id}`,
  };
}

type ListingRow = NonNullable<Awaited<ReturnType<typeof getPublishedListing>>>;

export function listing(l: ListingRow, full = false) {
  return {
    id: l.id,
    slug: l.slug,
    headline: l.headline,
    category: { value: l.category, label: categoryLabel(l.category) },
    manufacturer: l.manufacturer,
    model: l.model,
    year: l.yearOfManufacture,
    location: l.locationText,
    country: l.locationCountry,
    price: l.priceOnRequest || !l.askingPrice ? null : { amount: l.askingPrice.toString(), currency: l.currency },
    priceOnRequest: l.priceOnRequest || !l.askingPrice,
    sellerType: l.sellerType,
    photos: l.media.map((m) => ({ url: `/api/files/${m.documentId}`, caption: m.caption })),
    publishedAt: iso(l.publishedAt),
    webUrl: `/aircraft-for-sale/${l.slug}`,
    ...(full ? { description: l.description, registration: l.registration, serialNumber: l.serialNumber, totalTimeHours: l.totalTimeHours, landings: l.landings } : {}),
  };
}

export function notification(n: { id: string; type: string; title: string; body: string; link: string | null; readAt: Date | null; createdAt: Date }) {
  return { id: n.id, type: n.type, title: n.title, body: n.body, link: n.link && n.link.startsWith('/') ? n.link : null, read: Boolean(n.readAt), createdAt: iso(n.createdAt) };
}
