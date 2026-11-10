import { Pill, type Tone } from '@/components/ui/display';

type Def = [label: string, tone: Tone];

const MAP: Record<string, Record<string, Def>> = {
  operator: {
    DISCOVERED: ['Listed by regulator · unclaimed', 'unconfirmed'],
    CLAIMED: ['Claimed', 'neutral'],
    IN_REVIEW: ['In verification', 'indicative'],
    VERIFIED: ['Verified', 'verified'],
    AGREEMENT_SIGNED: ['Agreement signed', 'verified'],
    ACTIVE: ['Active', 'verified'],
    SUSPENDED: ['Suspended', 'danger'],
    REJECTED: ['Rejected', 'danger'],
    EXCLUDED: ['Excluded', 'unconfirmed'],
  },
  aircraftReview: {
    IMPORTED_UNREVIEWED: ['Imported · unconfirmed', 'unconfirmed'],
    DRAFT: ['Draft', 'neutral'],
    SUBMITTED: ['Submitted', 'indicative'],
    IN_REVIEW: ['In review', 'indicative'],
    APPROVED: ['Approved', 'verified'],
    REJECTED: ['Changes needed', 'danger'],
  },
  evidence: {
    AUTHORITY_REGISTRY: ['On regulator list', 'unconfirmed'],
    OPERATOR_PUBLISHED_CURRENT: ['Operator-published', 'unconfirmed'],
    FLIGHT_TRACKING_RECENT: ['Recently tracked', 'unconfirmed'],
    PUBLIC_RECORD_UNCONFIRMED: ['Public record · unconfirmed', 'unconfirmed'],
    MANAGED_NOT_CHARTER: ['Managed · not charter', 'unconfirmed'],
    NEEDS_OPERATOR_CONFIRMATION: ['Needs confirmation', 'indicative'],
    PUBLIC_MODEL_RECORD: ['Model-level only', 'unconfirmed'],
    OPERATOR_CONFIRMED: ['Operator-confirmed', 'indicative'],
    PLATFORM_VERIFIED: ['Verified by ThePrivate', 'verified'],
  },
  rfq: {
    SUBMITTED: ['Submitted', 'neutral'],
    MATCHING: ['Finding operators', 'indicative'],
    AWAITING_QUOTES: ['Awaiting quotes', 'indicative'],
    QUOTES_AVAILABLE: ['Quotes received', 'info'],
    ACCEPTED: ['Quote accepted', 'verified'],
    BOOKED: ['Booked', 'verified'],
    EXPIRED: ['Expired', 'unconfirmed'],
    CANCELLED: ['Cancelled', 'unconfirmed'],
  },
  quote: {
    SUBMITTED: ['Open', 'info'],
    REVISED: ['Revised', 'info'],
    ACCEPTED: ['Accepted', 'verified'],
    DECLINED: ['Declined', 'unconfirmed'],
    WITHDRAWN: ['Withdrawn', 'unconfirmed'],
    EXPIRED: ['Expired', 'unconfirmed'],
    SUPERSEDED: ['Superseded', 'unconfirmed'],
  },
  booking: {
    PENDING_OPERATOR_CONFIRMATION: ['Awaiting operator', 'indicative'],
    CONFIRMED: ['Confirmed · unpaid', 'indicative'],
    PAYMENT_PENDING: ['Confirmed · payment pending', 'indicative'],
    PAID: ['Paid', 'verified'],
    IN_PROGRESS: ['In progress', 'info'],
    COMPLETED: ['Completed', 'verified'],
    CANCELLED: ['Cancelled', 'danger'],
  },
  listing: {
    DRAFT: ['Draft', 'neutral'],
    SUBMITTED: ['Under review', 'indicative'],
    IN_REVIEW: ['Under review', 'indicative'],
    NEEDS_INFO: ['Needs information', 'danger'],
    APPROVED: ['Approved', 'verified'],
    PUBLISHED: ['Live', 'verified'],
    REJECTED: ['Not approved', 'danger'],
    SOLD: ['Sold', 'neutral'],
    WITHDRAWN: ['Withdrawn', 'unconfirmed'],
  },
  claim: {
    SUBMITTED: ['Under review', 'indicative'],
    NEEDS_INFO: ['Needs information', 'danger'],
    APPROVED: ['Approved', 'verified'],
    REJECTED: ['Not approved', 'danger'],
    WITHDRAWN: ['Withdrawn', 'unconfirmed'],
  },
  check: {
    PENDING: ['Not uploaded', 'unconfirmed'],
    SUBMITTED: ['Submitted', 'indicative'],
    ACCEPTED: ['Accepted', 'verified'],
    REJECTED: ['Rejected', 'danger'],
    EXPIRED: ['Expired', 'danger'],
  },
  emptyLeg: {
    DRAFT: ['Draft', 'neutral'],
    PENDING_REVIEW: ['In review', 'indicative'],
    PUBLISHED: ['Live', 'verified'],
    WITHDRAWN: ['Withdrawn', 'unconfirmed'],
    EXPIRED: ['Expired', 'unconfirmed'],
    SOLD: ['Sold', 'neutral'],
  },
  conflict: {
    OPEN: ['Open', 'danger'],
    AUTO_RESOLVED: ['Auto-resolved', 'indicative'],
    RESOLVED: ['Resolved', 'verified'],
    DISMISSED: ['Dismissed', 'unconfirmed'],
  },
  availability: {
    DECLARED_AVAILABLE: ['Operator-declared available', 'verified'],
    ON_REQUEST: ['Availability on request', 'unconfirmed'],
    BLOCKED: ['Unavailable', 'danger'],
  },
};

/**
 * Customer-facing wording for the same states. Customers never need to know how the marketplace
 * routes work internally; each label says where *their* journey stands. Meaning is unchanged:
 * nothing reads as confirmed or paid before the booking logic says so.
 */
const CUSTOMER: Partial<Record<StatusKind, Record<string, Def>>> = {
  rfq: {
    SUBMITTED: ['Request received', 'neutral'],
    MATCHING: ['Finding aircraft', 'indicative'],
    AWAITING_QUOTES: ['Waiting for offers', 'indicative'],
    QUOTES_AVAILABLE: ['Offers ready', 'info'],
    ACCEPTED: ['Offer chosen', 'verified'],
    BOOKED: ['Booked', 'verified'],
    EXPIRED: ['Expired', 'unconfirmed'],
    CANCELLED: ['Cancelled', 'unconfirmed'],
  },
  quote: {
    SUBMITTED: ['Open', 'info'],
    REVISED: ['Updated', 'info'],
    ACCEPTED: ['Chosen', 'verified'],
    DECLINED: ['Declined', 'unconfirmed'],
    WITHDRAWN: ['Withdrawn', 'unconfirmed'],
    EXPIRED: ['Expired', 'unconfirmed'],
    SUPERSEDED: ['Replaced', 'unconfirmed'],
  },
  booking: {
    PENDING_OPERATOR_CONFIRMATION: ['Awaiting confirmation', 'indicative'],
    CONFIRMED: ['Confirmed · not yet paid', 'indicative'],
    PAYMENT_PENDING: ['Confirmed · payment pending', 'indicative'],
    PAID: ['Paid', 'verified'],
    IN_PROGRESS: ['In flight', 'info'],
    COMPLETED: ['Completed', 'verified'],
    CANCELLED: ['Cancelled', 'danger'],
  },
  availability: {
    DECLARED_AVAILABLE: ['Available on your date', 'verified'],
    ON_REQUEST: ['Availability on request', 'unconfirmed'],
    BLOCKED: ['Unavailable', 'danger'],
  },
};

export type StatusKind = keyof typeof MAP;
export type Audience = 'internal' | 'customer';

function def(kind: StatusKind, value: string, audience: Audience): Def {
  return (audience === 'customer' ? CUSTOMER[kind]?.[value] : undefined) ?? MAP[kind]?.[value] ?? [value.replace(/_/g, ' ').toLowerCase(), 'neutral'];
}

export function statusLabel(kind: StatusKind, value: string, audience: Audience = 'internal') {
  return def(kind, value, audience)[0];
}

export function Status({ kind, value, audience = 'internal' }: { kind: StatusKind; value: string; audience?: Audience }) {
  const [label, tone] = def(kind, value, audience);
  return <Pill tone={tone}>{label}</Pill>;
}

export function categoryLabel(c: string | null | undefined) {
  if (!c) return 'Unclassified';
  return c.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (m) => m.toUpperCase()).replace('jet', 'jet').replace('Vip', 'VIP');
}

export const CATEGORY_OPTIONS = [
  'LIGHT_JET', 'MIDSIZE_JET', 'SUPER_MIDSIZE_JET', 'HEAVY_JET', 'ULTRA_LONG_RANGE_JET', 'VIP_AIRLINER', 'TURBOPROP', 'HELICOPTER_SINGLE', 'HELICOPTER_TWIN', 'PISTON', 'AIRLINER', 'BALLOON',
] as const;
