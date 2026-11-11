import 'server-only';
import { z } from 'zod';
import type { Viewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { lockScreenText, pushProvider } from './fcm';

const registerSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(['IOS', 'ANDROID']),
  appVersion: z.string().max(40).optional(),
});

/**
 * Registers this phone for the signed-in account. A token belongs to one account at a time: if the
 * phone signs in as someone else, the token moves (account switching never leaks notifications).
 */
export async function registerDevice(viewer: Viewer, raw: unknown) {
  const input = registerSchema.parse(raw);
  const d = await prisma.devicePushToken.upsert({
    where: { token: input.token },
    create: { userId: viewer.user.id, token: input.token, platform: input.platform, appVersion: input.appVersion ?? null },
    update: { userId: viewer.user.id, platform: input.platform, appVersion: input.appVersion ?? null, revokedAt: null, lastSeenAt: new Date() },
  });
  return { id: d.id };
}

/** Sign-out or push turned off on this phone. Only the owner can unregister their token. */
export async function unregisterDevice(viewer: Viewer, token: string) {
  const r = await prisma.devicePushToken.updateMany({ where: { token, userId: viewer.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return { revoked: r.count };
}

/** Sends one notification to every active device of its user. Returns a delivery outcome. */
export async function deliverPush(notification: { id: string; userId: string; type: string; link: string | null }) {
  const provider = pushProvider();
  if (!provider) return { status: 'SKIPPED_NOT_CONFIGURED' as const };
  const devices = await prisma.devicePushToken.findMany({ where: { userId: notification.userId, revokedAt: null } });
  if (!devices.length) return { status: 'SKIPPED_NOT_CONFIGURED' as const };
  const text = lockScreenText(notification.type);
  const sent: string[] = [];
  const errors: string[] = [];
  for (const d of devices) {
    const r = await provider.send({ token: d.token, ...text, data: { notificationId: notification.id, path: notification.link ?? '/account/notifications' } });
    if (r.ok) sent.push(r.id);
    else {
      errors.push(r.error);
      if (r.invalidToken) await prisma.devicePushToken.update({ where: { id: d.id }, data: { revokedAt: new Date() } });
    }
  }
  if (sent.length) return { status: 'SENT' as const, providerRef: sent.join(',').slice(0, 500) };
  // Every device failed: transient errors throw so the job retries; dead tokens just end here.
  if (errors.every((e) => /UNREGISTERED|INVALID_ARGUMENT|HTTP_404/.test(e))) return { status: 'FAILED' as const, error: errors.join('; ').slice(0, 500) };
  throw new Error(errors.join('; ').slice(0, 500));
}
