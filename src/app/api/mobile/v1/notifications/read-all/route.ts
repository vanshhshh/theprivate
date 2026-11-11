import { prisma } from '@/server/db/client';
import { mobile, must, preflight } from '@/server/mobile/http';

export const OPTIONS = preflight;

export const POST = mobile({ auth: 'required' }, async ({ viewer }) => {
  const r = await prisma.notification.updateMany({ where: { userId: must(viewer).user.id, readAt: null }, data: { readAt: new Date() } });
  return { updated: r.count };
});
