/**
 * Response shapes of /api/mobile/v1 (mirrors src/server/mobile/dto.ts on the server).
 * Money is a decimal string plus an ISO currency; dates are ISO strings; leg dates and times are
 * the departure airport's local wall clock.
 */
export type Tone = 'verified' | 'indicative' | 'unconfirmed' | 'danger' | 'neutral' | 'accent' | 'info';
export interface Status { value: string; label: string; tone: Tone }
export interface Labelled { value: string; label: string }

export interface Airport { id: string | null; code: string; icao: string | null; iata: string | null; name: string; city: string | null; country: string; timezone: string | null }
export interface AirportOption extends Airport { id: string; kind: string }

export interface Leg { from: Airport; to: Airport; date: string; time: string | null }
export interface Money { amount: string; currency: string }

export interface SearchResult {
  aircraftId: string;
  type: string;
  category: Labelled | null;
  seats: number;
  rangeNm: number | null;
  rangeNote: 'OK' | 'MAY_NEED_STOP' | 'UNVERIFIED';
  partner: { name: string; slug: string | null; authority: string | null };
  homeBase: string | null;
  availability: Status;
  indicative: { low: string; high: string; currency: string; blockHours: number } | null;
}
export interface SearchResponse { from: Airport; to: Airport; distanceNm: number; blocked: number; results: SearchResult[] }

export interface RequestSummary {
  reference: string;
  status: Status;
  tripType: 'ONE_WAY' | 'RETURN' | 'MULTI_LEG';
  passengers: number;
  legs: Leg[];
  openOffers: number;
  booking: { reference: string; status: Status } | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface Offer {
  id: string;
  status: Status;
  revision: number;
  validUntil: string;
  currency: string;
  price: string;
  taxes: string;
  inclusions: string[];
  exclusions: string[];
  terms: string | null;
  partner: { name: string; slug: string | null };
  aircraft: { type: string; category: Labelled | null; seats: number | null; year: number | null; rangeNm: number | null };
}

export interface RequestDetail extends Omit<RequestSummary, 'openOffers'> {
  category: Labelled | null;
  requirements: string | null;
  petsOnBoard: boolean;
  partnersContacted: number;
  offers: Offer[];
}

export interface Booking {
  reference: string;
  request: string;
  status: Status;
  nextStep: string | null;
  passengers: number;
  contactName: string;
  requirements: string | null;
  partner: { name: string };
  aircraft: { type: string; seats: number | null; registration: string };
  legs: Leg[];
  price: { amount: string; taxes: string; currency: string; inclusions: string[]; exclusions: string[]; terms: string | null } | null;
  payments: { status: string; amount: string; currency: string; settledAt: string | null }[];
  timeline: { status: Status; at: string }[];
}

export interface OneWay {
  id: string;
  from: Airport;
  to: Airport;
  windowStart: string;
  windowEnd: string;
  seats: number;
  price: Money | null;
  notes: string | null;
  aircraft: { type: string; category: Labelled | null; seats: number | null; year: number | null };
  partner: { name: string };
  webUrl: string;
}

export interface Listing {
  id: string;
  slug: string;
  headline: string;
  category: Labelled;
  manufacturer: string;
  model: string;
  year: number;
  location: string;
  country: string | null;
  price: Money | null;
  priceOnRequest: boolean;
  sellerType: string;
  photos: { url: string; caption: string | null }[];
  publishedAt: string | null;
  webUrl: string;
  description?: string;
  registration?: string | null;
  serialNumber?: string | null;
  totalTimeHours?: number | null;
  landings?: number | null;
}

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }

export interface Notification { id: string; type: string; title: string; body: string; link: string | null; read: boolean; createdAt: string }

export interface Profile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  timezone: string | null;
  companyName: string | null;
  preferredCurrency: string;
  marketingOptIn: boolean;
  isPartner: boolean;
  deletionRequestedAt: string | null;
}

export interface DiscoverResponse { oneWay: OneWay[]; aircraft: Listing[]; nextJourney: RequestSummary | null; unread: number }
