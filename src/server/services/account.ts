import 'server-only';
import { z } from 'zod';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError } from '@/server/errors';

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  companyName: z.string().trim().max(160).optional(),
  preferredCurrency: z.enum(['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD']),
  timezone: z.string().max(60),
  marketingOptIn: z.coerce.boolean().optional(),
});

/** Saves a customer's own profile settings (website settings page and mobile app). */
export async function saveSettings(viewer: Viewer, raw: unknown) {
  const input = settingsSchema.parse(raw);
  try {
    new Intl.DateTimeFormat('en', { timeZone: input.timezone });
  } catch {
    throw new AppError('VALIDATION', 'Unknown timezone.', { timezone: 'Unknown timezone' });
  }
  await prisma.user.update({ where: { id: viewer.user.id }, data: { name: input.name, phone: input.phone || null, timezone: input.timezone } });
  const profile = { companyName: input.companyName || null, preferredCurrency: input.preferredCurrency, marketingOptIn: Boolean(input.marketingOptIn) };
  await prisma.customerProfile.upsert({ where: { userId: viewer.user.id }, create: { userId: viewer.user.id, ...profile }, update: profile });
}

/** The customer's own profile, as shown in settings. */
export async function getProfile(viewer: Viewer) {
  const p = await prisma.customerProfile.findUnique({ where: { userId: viewer.user.id } });
  const u = viewer.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    phone: u.phone ?? null,
    timezone: u.timezone ?? null,
    companyName: p?.companyName ?? null,
    preferredCurrency: p?.preferredCurrency ?? 'INR',
    marketingOptIn: p?.marketingOptIn ?? false,
    isPartner: viewer.memberships.length > 0,
  };
}
