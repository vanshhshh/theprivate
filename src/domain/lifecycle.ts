/**
 * Explicit lifecycle state machines. Every status change in a service goes through
 * `assertTransition`, so an illegal jump (e.g. a booking straight to PAID) is impossible
 * regardless of which UI or API triggered it.
 */
import type {
  AircraftReviewStatus,
  BookingStatus,
  EmptyLegStatus,
  OperatorLifecycle,
  QuoteStatus,
  RfqStatus,
  SaleListingStatus,
} from '@/generated/prisma/enums';

/** Who is allowed to trigger a transition. PAYMENT = verified provider webhook / audited settlement. */
export type Actor = 'CUSTOMER' | 'OPERATOR' | 'STAFF' | 'SYSTEM' | 'PAYMENT';

type Edge<S extends string> = { to: S; by: readonly Actor[] };
type Machine<S extends string> = Record<S, readonly Edge<S>[]>;

export class TransitionError extends Error {
  constructor(machine: string, from: string, to: string, actor: Actor) {
    super(`${machine}: ${from} → ${to} is not allowed for ${actor.toLowerCase()}.`);
    this.name = 'TransitionError';
  }
}

function machine<S extends string>(name: string, def: Machine<S>) {
  return {
    name,
    can(from: S, to: S, actor: Actor): boolean {
      return def[from].some((e) => e.to === to && e.by.includes(actor));
    },
    assert(from: S, to: S, actor: Actor): void {
      if (!this.can(from, to, actor)) throw new TransitionError(name, from, to, actor);
    },
    next(from: S, actor: Actor): S[] {
      return def[from].filter((e) => e.by.includes(actor)).map((e) => e.to);
    },
  };
}

const S = ['STAFF'] as const;
const SYS = ['SYSTEM'] as const;
const OP = ['OPERATOR'] as const;

export const operatorLifecycle = machine<OperatorLifecycle>('Operator', {
  DISCOVERED: [{ to: 'CLAIMED', by: S }, { to: 'EXCLUDED', by: S }, { to: 'REJECTED', by: S }],
  CLAIMED: [{ to: 'IN_REVIEW', by: ['OPERATOR', 'STAFF'] }, { to: 'SUSPENDED', by: S }, { to: 'DISCOVERED', by: S }],
  IN_REVIEW: [{ to: 'VERIFIED', by: S }, { to: 'CLAIMED', by: S }, { to: 'REJECTED', by: S }],
  VERIFIED: [{ to: 'AGREEMENT_SIGNED', by: ['OPERATOR', 'STAFF'] }, { to: 'SUSPENDED', by: S }],
  AGREEMENT_SIGNED: [{ to: 'ACTIVE', by: S }, { to: 'SUSPENDED', by: S }],
  ACTIVE: [{ to: 'SUSPENDED', by: S }],
  SUSPENDED: [{ to: 'ACTIVE', by: S }, { to: 'VERIFIED', by: S }],
  REJECTED: [{ to: 'DISCOVERED', by: S }],
  EXCLUDED: [{ to: 'DISCOVERED', by: S }],
});

export const aircraftReview = machine<AircraftReviewStatus>('Aircraft', {
  IMPORTED_UNREVIEWED: [{ to: 'DRAFT', by: ['OPERATOR', 'STAFF'] }],
  DRAFT: [{ to: 'SUBMITTED', by: OP }],
  SUBMITTED: [{ to: 'IN_REVIEW', by: S }, { to: 'APPROVED', by: S }, { to: 'REJECTED', by: S }, { to: 'DRAFT', by: OP }],
  IN_REVIEW: [{ to: 'APPROVED', by: S }, { to: 'REJECTED', by: S }],
  APPROVED: [{ to: 'DRAFT', by: ['OPERATOR', 'STAFF'] }],
  REJECTED: [{ to: 'DRAFT', by: ['OPERATOR', 'STAFF'] }],
});

export const rfqLifecycle = machine<RfqStatus>('Request', {
  SUBMITTED: [{ to: 'MATCHING', by: SYS }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }],
  MATCHING: [{ to: 'AWAITING_QUOTES', by: ['SYSTEM', 'STAFF'] }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }, { to: 'EXPIRED', by: SYS }],
  AWAITING_QUOTES: [{ to: 'QUOTES_AVAILABLE', by: SYS }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }, { to: 'EXPIRED', by: SYS }],
  QUOTES_AVAILABLE: [{ to: 'ACCEPTED', by: ['CUSTOMER'] }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }, { to: 'EXPIRED', by: SYS }],
  ACCEPTED: [{ to: 'BOOKED', by: ['SYSTEM'] }, { to: 'QUOTES_AVAILABLE', by: SYS }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }],
  BOOKED: [{ to: 'CANCELLED', by: ['SYSTEM'] }],
  EXPIRED: [],
  CANCELLED: [],
});

export const quoteLifecycle = machine<QuoteStatus>('Quote', {
  SUBMITTED: [
    { to: 'REVISED', by: OP },
    { to: 'ACCEPTED', by: ['CUSTOMER'] },
    { to: 'DECLINED', by: ['CUSTOMER', 'SYSTEM'] },
    { to: 'WITHDRAWN', by: OP },
    { to: 'EXPIRED', by: SYS },
  ],
  REVISED: [
    { to: 'REVISED', by: OP },
    { to: 'ACCEPTED', by: ['CUSTOMER'] },
    { to: 'DECLINED', by: ['CUSTOMER', 'SYSTEM'] },
    { to: 'WITHDRAWN', by: OP },
    { to: 'EXPIRED', by: SYS },
  ],
  ACCEPTED: [{ to: 'WITHDRAWN', by: ['SYSTEM'] }],
  DECLINED: [],
  WITHDRAWN: [],
  EXPIRED: [],
  SUPERSEDED: [],
});

export const bookingLifecycle = machine<BookingStatus>('Booking', {
  PENDING_OPERATOR_CONFIRMATION: [{ to: 'CONFIRMED', by: OP }, { to: 'CANCELLED', by: ['CUSTOMER', 'OPERATOR', 'STAFF'] }],
  CONFIRMED: [{ to: 'PAYMENT_PENDING', by: ['SYSTEM', 'STAFF'] }, { to: 'PAID', by: ['PAYMENT'] }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }],
  PAYMENT_PENDING: [{ to: 'PAID', by: ['PAYMENT'] }, { to: 'CANCELLED', by: ['CUSTOMER', 'STAFF'] }],
  PAID: [{ to: 'IN_PROGRESS', by: ['OPERATOR', 'STAFF'] }, { to: 'CANCELLED', by: S }],
  IN_PROGRESS: [{ to: 'COMPLETED', by: ['OPERATOR', 'STAFF'] }],
  COMPLETED: [],
  CANCELLED: [],
});

export const saleListingLifecycle = machine<SaleListingStatus>('Listing', {
  DRAFT: [{ to: 'SUBMITTED', by: ['CUSTOMER'] }, { to: 'WITHDRAWN', by: ['CUSTOMER'] }],
  SUBMITTED: [{ to: 'IN_REVIEW', by: S }, { to: 'PUBLISHED', by: S }, { to: 'REJECTED', by: S }, { to: 'NEEDS_INFO', by: S }, { to: 'WITHDRAWN', by: ['CUSTOMER'] }],
  IN_REVIEW: [{ to: 'PUBLISHED', by: S }, { to: 'REJECTED', by: S }, { to: 'NEEDS_INFO', by: S }],
  NEEDS_INFO: [{ to: 'SUBMITTED', by: ['CUSTOMER'] }, { to: 'WITHDRAWN', by: ['CUSTOMER'] }],
  APPROVED: [{ to: 'PUBLISHED', by: S }],
  PUBLISHED: [{ to: 'SOLD', by: ['CUSTOMER', 'STAFF'] }, { to: 'WITHDRAWN', by: ['CUSTOMER', 'STAFF'] }, { to: 'NEEDS_INFO', by: S }],
  REJECTED: [],
  SOLD: [],
  WITHDRAWN: [],
});

export const emptyLegLifecycle = machine<EmptyLegStatus>('Empty leg', {
  DRAFT: [{ to: 'PUBLISHED', by: OP }, { to: 'WITHDRAWN', by: OP }],
  PENDING_REVIEW: [{ to: 'PUBLISHED', by: S }, { to: 'WITHDRAWN', by: ['OPERATOR', 'STAFF'] }],
  PUBLISHED: [{ to: 'WITHDRAWN', by: ['OPERATOR', 'STAFF'] }, { to: 'EXPIRED', by: SYS }, { to: 'SOLD', by: OP }],
  WITHDRAWN: [],
  EXPIRED: [],
  SOLD: [],
});
