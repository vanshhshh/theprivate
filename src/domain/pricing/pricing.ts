/**
 * Customer pricing. Pure and exact: amounts are converted to integer minor units (BigInt)
 * so no floating-point error can reach an invoice. The browser never supplies a customer
 * price; it is always derived here from the operator price and the signed agreement.
 */

export interface AgreementTerms {
  commissionBps: number; // 1 bp = 0.01 %
  minimumFee: string | null; // in agreement currency
}

export interface PriceBreakdown {
  operatorPrice: string;
  platformFee: string;
  taxes: string;
  customerPrice: string;
  taxesIncluded: boolean; // false ⇒ display "excl. taxes" (no tax rule configured)
}

const toMinor = (amount: string): bigint => {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(amount)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, frac = ''] = amount.split('.');
  return BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'));
};
const fromMinor = (m: bigint): string => `${m / 100n}.${String(m % 100n).padStart(2, '0')}`;
/** Round half up on basis-point multiplication. */
const applyBps = (m: bigint, bps: number): bigint => (m * BigInt(bps) + 5000n) / 10000n;

export function computeCustomerPrice(operatorPrice: string, terms: AgreementTerms, taxRateBps: number | null): PriceBreakdown {
  if (!Number.isInteger(terms.commissionBps) || terms.commissionBps < 0 || terms.commissionBps > 5000) {
    throw new Error('Commission must be between 0 and 5000 bps');
  }
  const op = toMinor(operatorPrice);
  if (op <= 0n) throw new Error('Operator price must be positive');
  let fee = applyBps(op, terms.commissionBps);
  if (terms.minimumFee) {
    const min = toMinor(terms.minimumFee);
    if (fee < min) fee = min;
  }
  const taxes = taxRateBps === null ? 0n : applyBps(op + fee, taxRateBps);
  return {
    operatorPrice: fromMinor(op),
    platformFee: fromMinor(fee),
    taxes: fromMinor(taxes),
    customerPrice: fromMinor(op + fee + taxes),
    taxesIncluded: taxRateBps !== null,
  };
}

export interface IndicativeInput {
  distanceNm: number;
  cruiseKtas: number | null; // from AircraftType, must be sourced; null ⇒ no estimate
  hourlyRate: string | null; // operator's active pricing rule
  minimumBillableHours: number;
  commissionBps: number | null; // from the signed agreement
}

/**
 * An INDICATIVE one-way estimate. Returns null unless every input is known: we never show a
 * price built on a guessed speed, rate or commission. Labelled as indicative in every UI.
 */
export function indicativePrice(i: IndicativeInput): { low: string; high: string; blockHours: number } | null {
  if (!i.cruiseKtas || !i.hourlyRate || i.commissionBps === null || i.distanceNm <= 0) return null;
  const blockHours = Math.max(i.minimumBillableHours, i.distanceNm / i.cruiseKtas + 0.3); // +0.3 h taxi/climb allowance
  const rate = Number(i.hourlyRate);
  const base = blockHours * rate * (1 + i.commissionBps / 10000);
  // ±15 % band reflects routing, winds, fees and positioning that only a real quote can settle.
  const round = (x: number) => (Math.round(x / 1000) * 1000).toFixed(2);
  return { low: round(base * 0.85), high: round(base * 1.15), blockHours: Math.round(blockHours * 10) / 10 };
}
