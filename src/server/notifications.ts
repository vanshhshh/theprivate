import 'server-only';
import { prisma, type Tx } from '@/server/db/client';

interface NotifyInput {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  link?: string;
}

/**
 * In-app notification + queued e-mail delivery, written in the caller's transaction (outbox).
 * The worker delivers e-mails; without provider credentials the delivery is recorded as
 * SKIPPED_NOT_CONFIGURED. Nothing claims a message was sent when it was not.
 */
export async function notify(input: NotifyInput, tx: Tx | typeof prisma = prisma) {
  for (const userId of [...new Set(input.userIds)]) {
    // Push only for people who have the app and allowed notifications on at least one phone.
    const hasDevice = (await tx.devicePushToken.count({ where: { userId, revokedAt: null } })) > 0;
    const n = await tx.notification.create({
      data: { userId, type: input.type, title: input.title, body: input.body, link: input.link, deliveries: { create: [{ channel: 'EMAIL' }, ...(hasDevice ? [{ channel: 'PUSH' as const }] : [])] } },
      include: { deliveries: true },
    });
    for (const d of n.deliveries) {
      await tx.job.create({ data: { type: 'notification.deliver', payload: { deliveryId: d.id }, dedupeKey: `deliver:${d.id}` } });
    }
  }
}

/** Active members of an operator, optionally limited to roles (used to address notifications). */
export async function operatorMemberIds(operatorId: string, tx: Tx | typeof prisma = prisma) {
  const ms = await tx.operatorMembership.findMany({ where: { operatorId, status: 'ACTIVE' }, select: { userId: true } });
  return ms.map((m) => m.userId);
}

export async function staffWith(roles: ('SUPER_ADMIN' | 'OPERATIONS' | 'SUPPLY' | 'SALES_DESK' | 'DATA_STEWARD' | 'SUPPORT')[], tx: Tx | typeof prisma = prisma) {
  const rs = await tx.staffRoleAssignment.findMany({ where: { role: { in: roles }, revokedAt: null }, select: { userId: true } });
  return [...new Set(rs.map((r) => r.userId))];
}
