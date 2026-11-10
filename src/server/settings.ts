import 'server-only';
import { z } from 'zod';
import { prisma, type Tx } from '@/server/db/client';

/**
 * Platform settings that require commercial/legal input are stored, not hard-coded.
 * Defaults are deliberately conservative: no tax rate is assumed until one is configured.
 */
const SCHEMAS = {
  /** Tax on charter by country in basis points; null = not configured (prices shown "excl. taxes"). */
  'tax.charterBps': z.record(z.string().length(2), z.number().int().min(0).max(5000).nullable()),
  /** Default quote validity offered to operators (hours). */
  'quote.defaultValidityHours': z.number().int().min(1).max(24 * 14),
  /** RFQs expire if no quote is accepted within this many hours of the first departure date. */
  'rfq.expiryHours': z.number().int().min(24).max(24 * 60),
  /** Payment mode: pre-payment = settlement handled offline and recorded by staff with evidence. */
  'payments.mode': z.enum(['pre-payment', 'razorpay', 'stripe']),
  /**
   * One-time company onboarding fee. Separate from charter payments. Nothing is collected until
   * `enabled` is true AND an amount, a tax treatment (taxRateBps, 0 allowed) and a refund policy
   * are set. Amounts are minor units (paise, fils, cents).
   */
  'onboarding.fee': z.object({
    enabled: z.boolean(),
    currency: z.enum(['INR', 'AED', 'USD', 'EUR', 'GBP']),
    amountMinor: z.number().int().positive().nullable(),
    taxRateBps: z.number().int().min(0).max(5000).nullable(),
    taxLabel: z.string().trim().max(40).nullable(),
    refundPolicy: z.string().trim().max(2000).nullable(),
    coverage: z.string().trim().max(1000).nullable(),
    byCountry: z.record(z.string().length(2), z.object({ currency: z.enum(['INR', 'AED', 'USD', 'EUR', 'GBP']), amountMinor: z.number().int().positive(), taxRateBps: z.number().int().min(0).max(5000), taxLabel: z.string().trim().max(40).nullable() })),
  }),
} as const;

type Key = keyof typeof SCHEMAS;
type Value<K extends Key> = z.infer<(typeof SCHEMAS)[K]>;

const DEFAULTS: { [K in Key]: Value<K> } = {
  'tax.charterBps': { IN: null, AE: null },
  'quote.defaultValidityHours': 48,
  'rfq.expiryHours': 24 * 14,
  'payments.mode': 'pre-payment',
  'onboarding.fee': { enabled: false, currency: 'INR', amountMinor: null, taxRateBps: null, taxLabel: null, refundPolicy: null, coverage: null, byCountry: {} },
};

export async function getSetting<K extends Key>(key: K, tx: Tx | typeof prisma = prisma): Promise<Value<K>> {
  const row = await tx.systemSetting.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key];
  const parsed = SCHEMAS[key].safeParse(row.value);
  return (parsed.success ? parsed.data : DEFAULTS[key]) as Value<K>;
}

export async function setSetting<K extends Key>(key: K, value: unknown, updatedById: string, tx: Tx | typeof prisma = prisma) {
  const v = SCHEMAS[key].parse(value);
  await tx.systemSetting.upsert({ where: { key }, create: { key, value: v as never, updatedById }, update: { value: v as never, updatedById } });
  return v;
}

export const SETTING_KEYS = Object.keys(SCHEMAS) as Key[];
export const settingDefaults = DEFAULTS;
