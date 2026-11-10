/**
 * Company onboarding fee: pure rules (no I/O). Money is integer minor units throughout.
 */

export type OnboardingPaymentStatus = 'PAYMENT_PENDING' | 'PAYMENT_PROCESSING' | 'PAID' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED' | 'REFUND_PENDING' | 'REFUNDED' | 'PAYMENT_REVERSED';

export interface FeeConfig {
  enabled: boolean;
  currency: string;
  amountMinor: number | null;
  taxRateBps: number | null;
  taxLabel: string | null;
  refundPolicy: string | null;
  coverage: string | null;
  byCountry: Record<string, { currency: string; amountMinor: number; taxRateBps: number; taxLabel: string | null }>;
}

export interface FeeQuote {
  feeMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  taxRateBps: number;
  taxLabel: string | null;
  refundPolicy: string;
  coverage: string | null;
}

/** Why collection is off, in plain words; empty when a fee can be charged. */
export function feeBlockers(c: FeeConfig): string[] {
  if (!c.enabled) return ['Onboarding fee collection is switched off.'];
  return [
    !c.amountMinor && 'No fee amount is configured.',
    c.taxRateBps === null && 'No tax treatment is configured (use 0 if no tax applies).',
    !c.refundPolicy && 'No refund policy is configured.',
  ].filter(Boolean) as string[];
}

/** Tax in minor units, rounded half up. */
export const taxOf = (feeMinor: number, bps: number) => Math.floor((feeMinor * bps + 5_000) / 10_000);

/** The amount a company in `countryCode` pays, or null if no fee can be charged. */
export function quoteFee(c: FeeConfig, countryCode: string): FeeQuote | null {
  if (feeBlockers(c).length) return null;
  const local = c.byCountry[countryCode];
  const currency = local?.currency ?? c.currency;
  const feeMinor = local?.amountMinor ?? c.amountMinor!;
  const taxRateBps = local?.taxRateBps ?? c.taxRateBps!;
  const taxMinor = taxOf(feeMinor, taxRateBps);
  return { feeMinor, taxMinor, totalMinor: feeMinor + taxMinor, currency, taxRateBps, taxLabel: local?.taxLabel ?? c.taxLabel, refundPolicy: c.refundPolicy!, coverage: c.coverage };
}

const T: Record<OnboardingPaymentStatus, OnboardingPaymentStatus[]> = {
  PAYMENT_PENDING: ['PAYMENT_PROCESSING', 'PAID', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED'],
  PAYMENT_PROCESSING: ['PAID', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED'],
  PAID: ['REFUND_PENDING', 'REFUNDED', 'PAYMENT_REVERSED'],
  REFUND_PENDING: ['REFUNDED', 'PAID'],
  PAYMENT_FAILED: [],
  PAYMENT_CANCELLED: [],
  REFUNDED: [],
  PAYMENT_REVERSED: [],
};

export const canTransition = (from: OnboardingPaymentStatus, to: OnboardingPaymentStatus) => T[from].includes(to);

/** A provider confirmation must match the snapshot exactly, or the payment is not accepted. */
export function matchesSnapshot(snapshot: { totalMinor: number; currency: string }, reported: { amountMinor: number; currency: string }) {
  return snapshot.totalMinor === reported.amountMinor && snapshot.currency.toUpperCase() === reported.currency.toUpperCase();
}

export function formatMinor(minor: number, currency: string) {
  const digits = currency === 'JPY' ? 0 : 2;
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-GB', { style: 'currency', currency, minimumFractionDigits: digits }).format(minor / 10 ** digits);
}
