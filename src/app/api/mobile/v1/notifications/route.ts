import { prisma } from '@/server/db/client';
import { notification } from '@/server/mobile/dto';
import { mobile, must, preflight } from '@/server/mobile/http';

export const OPTIONS = preflight;

export const GET = mobile({ auth: 'required' }, async ({ viewer }) => {
  const v = must(viewer);
  const items = await prisma.notification.findMany({ where: { userId: v.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return { items: items.map(notification), unread: items.filter((n) => !n.readAt).length };
});
