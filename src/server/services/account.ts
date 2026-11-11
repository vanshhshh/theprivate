import 'server-only';
import { z } from 'zod';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { audit } from '@/server/audit';
import { enqueueEmail } from '@/server/email/outbox';
import { AppError } from '@/server/errors';
import { notify, staffWith } from '@/server/notifications';

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

/** Marks a staff-queue message as an account-deletion request (no schema change needed). */
export const DELETION_PREFIX = '[ACCOUNT DELETION REQUEST]';

async function openDeletionRequest(userId: string) {
  return prisma.contactMessage.findFirst({ where: { userId, handledAt: null, message: { startsWith: DELETION_PREFIX } }, orderBy: { createdAt: 'desc' } });
}

/**
 * The customer asks for their account to be deleted (website settings and mobile app; required by
 * the App Store and Google Play). The request goes to the staff queue (Admin → Messages) with an
 * audit record and an e-mail confirmation; staff verify and complete it. Asking twice does not
 * create a second request.
 */
export async function requestAccountDeletion(viewer: Viewer, raw: unknown) {
  const input = z.object({ reason: z.string().trim().max(1000).optional() }).parse(raw ?? {});
  const existing = await openDeletionRequest(viewer.user.id);
  if (existing) return { requestedAt: existing.createdAt, alreadyRequested: true };
  return prisma.$transaction(async (tx) => {
    const m = await tx.contactMessage.create({
      data: {
        topic: 'SUPPORT',
        name: viewer.user.name,
        email: viewer.user.email,
        phone: viewer.user.phone ?? null,
        userId: viewer.user.id,
        message: `${DELETION_PREFIX}
The account holder asked for their ThePrivate account to be deleted.${input.reason ? `
Reason given: ${input.reason}` : ''}`,
      },
    });
    await notify({ userIds: await staffWith(['SUPPORT', 'SUPER_ADMIN'], tx), type: 'account.deletion_requested', title: 'Account deletion requested', body: `${viewer.user.email} asked for their account to be deleted.`, link: '/admin/messages' }, tx);
    await audit({ actorUserId: viewer.user.id, action: 'account.deletion_request', entityType: 'User', entityId: viewer.user.id, after: { messageId: m.id } }, tx);
    await enqueueEmail(
      tx,
      { to: viewer.user.email, subject: 'We received your account deletion request', text: `Hello ${viewer.user.name.split(' ')[0] || 'there'},

We have received your request to delete your ThePrivate account. Our team will verify it and confirm by e-mail once it is complete.

If you did not ask for this, reply to this e-mail straight away.

ThePrivate` },
      `account-deletion:${m.id}`,
    );
    return { requestedAt: m.createdAt, alreadyRequested: false };
  });
}

/** The customer's own profile, as shown in settings. */
export async function getProfile(viewer: Viewer) {
  const [p, deletion] = await Promise.all([prisma.customerProfile.findUnique({ where: { userId: viewer.user.id } }), openDeletionRequest(viewer.user.id)]);
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
    deletionRequestedAt: deletion?.createdAt.toISOString() ?? null,
  };
}
