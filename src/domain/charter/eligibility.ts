/**
 * Supply eligibility rules: the single definition of "this aircraft may be offered to a customer".
 * Used by search, RFQ matching, quoting and empty legs.
 */
import type { AircraftOperationalStatus, AircraftReviewStatus, OperatorLifecycle } from '@/generated/prisma/enums';

export interface EligibilityInput {
  operatorLifecycle: OperatorLifecycle;
  reviewStatus: AircraftReviewStatus;
  charterEligible: boolean;
  operationalStatus: AircraftOperationalStatus;
  deletedAt: Date | null;
  attributionUncertain: boolean;
}

export function quotabilityProblems(a: EligibilityInput): string[] {
  const p: string[] = [];
  if (a.operatorLifecycle !== 'ACTIVE') p.push('Operator is not active on ThePrivate.');
  if (a.reviewStatus !== 'APPROVED') p.push('Aircraft has not been approved.');
  if (!a.charterEligible) p.push('Aircraft is not enabled for charter.');
  if (a.operationalStatus !== 'ACTIVE') p.push('Aircraft is not operationally active.');
  if (a.deletedAt) p.push('Aircraft was removed.');
  if (a.attributionUncertain) p.push('Aircraft ownership needs confirmation.');
  return p;
}

export const isQuotable = (a: EligibilityInput) => quotabilityProblems(a).length === 0;

/** Prisma `where` fragment mirroring isQuotable, for efficient DB queries. */
export const QUOTABLE_AIRCRAFT_WHERE = {
  reviewStatus: 'APPROVED',
  charterEligible: true,
  operationalStatus: 'ACTIVE',
  deletedAt: null,
  attributionUncertain: false,
  operator: { lifecycle: 'ACTIVE', deletedAt: null },
} as const;

/** How fresh an operator's availability confirmation must be to be shown as "declared available". */
export const AVAILABILITY_FRESHNESS_DAYS = 14;

export type AvailabilitySignal = 'DECLARED_AVAILABLE' | 'BLOCKED' | 'ON_REQUEST';

export function availabilitySignal(
  windows: { kind: 'AVAILABLE' | 'BLOCKED' | 'MAINTENANCE'; startsAt: Date; endsAt: Date; confirmedAt: Date }[],
  at: Date,
  now: Date,
): AvailabilitySignal {
  const covering = windows.filter((w) => w.startsAt <= at && w.endsAt >= at);
  if (covering.some((w) => w.kind !== 'AVAILABLE')) return 'BLOCKED';
  const fresh = covering.find((w) => w.kind === 'AVAILABLE' && now.getTime() - w.confirmedAt.getTime() <= AVAILABILITY_FRESHNESS_DAYS * 86_400_000);
  return fresh ? 'DECLARED_AVAILABLE' : 'ON_REQUEST';
}
