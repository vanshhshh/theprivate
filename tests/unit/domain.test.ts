import { describe, expect, it } from 'vitest';
import { availabilitySignal, isQuotable } from '@/domain/charter/eligibility';
import { bookingLifecycle, operatorLifecycle, quoteLifecycle, saleListingLifecycle, TransitionError } from '@/domain/lifecycle';
import { computeCustomerPrice, indicativePrice } from '@/domain/pricing/pricing';
import { permissionsFor } from '@/server/auth/permissions';

describe('operator lifecycle', () => {
  it('follows DISCOVERED → CLAIMED → IN_REVIEW → VERIFIED → AGREEMENT_SIGNED → ACTIVE', () => {
    expect(operatorLifecycle.can('DISCOVERED', 'CLAIMED', 'STAFF')).toBe(true);
    expect(operatorLifecycle.can('CLAIMED', 'IN_REVIEW', 'OPERATOR')).toBe(true);
    expect(operatorLifecycle.can('IN_REVIEW', 'VERIFIED', 'STAFF')).toBe(true);
    expect(operatorLifecycle.can('VERIFIED', 'AGREEMENT_SIGNED', 'OPERATOR')).toBe(true);
    expect(operatorLifecycle.can('AGREEMENT_SIGNED', 'ACTIVE', 'STAFF')).toBe(true);
  });
  it('never lets an operator verify or activate itself, or skip steps', () => {
    expect(operatorLifecycle.can('IN_REVIEW', 'VERIFIED', 'OPERATOR')).toBe(false);
    expect(operatorLifecycle.can('AGREEMENT_SIGNED', 'ACTIVE', 'OPERATOR')).toBe(false);
    expect(operatorLifecycle.can('DISCOVERED', 'ACTIVE', 'STAFF')).toBe(false);
    expect(operatorLifecycle.can('VERIFIED', 'ACTIVE', 'STAFF')).toBe(false);
    expect(() => operatorLifecycle.assert('CLAIMED', 'VERIFIED', 'STAFF')).toThrow(TransitionError);
  });
});

describe('booking lifecycle', () => {
  it('only a payment actor can mark a booking PAID', () => {
    expect(bookingLifecycle.can('CONFIRMED', 'PAID', 'STAFF')).toBe(false);
    expect(bookingLifecycle.can('CONFIRMED', 'PAID', 'OPERATOR')).toBe(false);
    expect(bookingLifecycle.can('CONFIRMED', 'PAID', 'PAYMENT')).toBe(true);
    expect(bookingLifecycle.can('PENDING_OPERATOR_CONFIRMATION', 'PAID', 'PAYMENT')).toBe(false);
  });
  it('cannot fly an unpaid booking or reopen a terminal one', () => {
    expect(bookingLifecycle.can('CONFIRMED', 'IN_PROGRESS', 'OPERATOR')).toBe(false);
    expect(bookingLifecycle.next('CANCELLED', 'STAFF')).toEqual([]);
    expect(bookingLifecycle.next('COMPLETED', 'STAFF')).toEqual([]);
  });
});

describe('quote and listing lifecycles', () => {
  it('only customers accept quotes; expired quotes are final', () => {
    expect(quoteLifecycle.can('SUBMITTED', 'ACCEPTED', 'OPERATOR')).toBe(false);
    expect(quoteLifecycle.can('REVISED', 'ACCEPTED', 'CUSTOMER')).toBe(true);
    expect(quoteLifecycle.next('EXPIRED', 'CUSTOMER')).toEqual([]);
  });
  it('only staff publish sale listings', () => {
    expect(saleListingLifecycle.can('SUBMITTED', 'PUBLISHED', 'CUSTOMER')).toBe(false);
    expect(saleListingLifecycle.can('SUBMITTED', 'PUBLISHED', 'STAFF')).toBe(true);
  });
});

describe('pricing', () => {
  it('adds commission exactly in minor units', () => {
    const p = computeCustomerPrice('1000000.00', { commissionBps: 800, minimumFee: null }, null);
    expect(p).toEqual({ operatorPrice: '1000000.00', platformFee: '80000.00', taxes: '0.00', customerPrice: '1080000.00', taxesIncluded: false });
  });
  it('applies a minimum fee and taxes on the total', () => {
    const p = computeCustomerPrice('10000.00', { commissionBps: 500, minimumFee: '2500.00' }, 1800);
    expect(p.platformFee).toBe('2500.00');
    expect(p.taxes).toBe('2250.00');
    expect(p.customerPrice).toBe('14750.00');
  });
  it('rounds half up and rejects malformed or negative input', () => {
    expect(computeCustomerPrice('0.05', { commissionBps: 1000, minimumFee: null }, null).platformFee).toBe('0.01');
    expect(() => computeCustomerPrice('-5', { commissionBps: 100, minimumFee: null }, null)).toThrow();
    expect(() => computeCustomerPrice('1e9', { commissionBps: 100, minimumFee: null }, null)).toThrow();
  });
  it('gives no indicative price when any input is unknown', () => {
    expect(indicativePrice({ distanceNm: 600, cruiseKtas: null, hourlyRate: '300000', minimumBillableHours: 1, commissionBps: 800 })).toBeNull();
    expect(indicativePrice({ distanceNm: 600, cruiseKtas: 430, hourlyRate: '300000', minimumBillableHours: 1, commissionBps: null })).toBeNull();
    const r = indicativePrice({ distanceNm: 600, cruiseKtas: 430, hourlyRate: '300000', minimumBillableHours: 1, commissionBps: 800 });
    expect(r!.blockHours).toBe(1.7);
    expect(Number(r!.low)).toBeLessThan(Number(r!.high));
  });
});

describe('eligibility and availability', () => {
  const ok = { operatorLifecycle: 'ACTIVE', reviewStatus: 'APPROVED', charterEligible: true, operationalStatus: 'ACTIVE', deletedAt: null, attributionUncertain: false } as const;
  it('requires every gate', () => {
    expect(isQuotable(ok)).toBe(true);
    expect(isQuotable({ ...ok, operatorLifecycle: 'VERIFIED' })).toBe(false);
    expect(isQuotable({ ...ok, reviewStatus: 'IMPORTED_UNREVIEWED' })).toBe(false);
    expect(isQuotable({ ...ok, attributionUncertain: true })).toBe(false);
  });
  it('never presents stale or absent availability as available', () => {
    const now = new Date('2026-11-04T00:00:00Z');
    const at = new Date('2026-11-10T06:00:00Z');
    const win = (kind: 'AVAILABLE' | 'BLOCKED', confirmedDaysAgo: number) => ({ kind, startsAt: new Date('2026-11-09'), endsAt: new Date('2026-11-12'), confirmedAt: new Date(now.getTime() - confirmedDaysAgo * 86_400_000) });
    expect(availabilitySignal([], at, now)).toBe('ON_REQUEST');
    expect(availabilitySignal([win('AVAILABLE', 2)], at, now)).toBe('DECLARED_AVAILABLE');
    expect(availabilitySignal([win('AVAILABLE', 30)], at, now)).toBe('ON_REQUEST');
    expect(availabilitySignal([win('AVAILABLE', 1), win('BLOCKED', 1)], at, now)).toBe('BLOCKED');
  });
});

describe('permissions', () => {
  it('gives only SUPER_ADMIN user management, and support no write access', () => {
    expect(permissionsFor(['SUPER_ADMIN']).has('user.manage')).toBe(true);
    expect(permissionsFor(['OPERATIONS', 'SUPPLY']).has('user.manage')).toBe(false);
    const support = permissionsFor(['SUPPORT']);
    expect(['booking.manage', 'aircraft.review', 'data.resolve', 'payment.record_offline'].some((p) => support.has(p as never))).toBe(false);
    expect(permissionsFor(['SALES_DESK']).has('operator.contacts.read')).toBe(false);
  });
});
