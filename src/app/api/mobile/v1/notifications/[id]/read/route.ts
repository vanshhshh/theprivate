import { prisma } from '@/server/db/client';
import { notFound } from '@/server/errors';
import { notification } from '@/server/mobile/dto';
import { mobile, must, preflight } from '@/server/mobile/http';

export const OPTIONS = preflight;

/** Marks one of the viewer's own notifications read and returns it (with its in-app link). */
export const POST = mobile<{ id: string }>({ auth: 'required' }, async ({ params, viewer }) => {
  const v = must(viewer);
  const n = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!n || n.userId !== v.user.id) throw notFound('Notification');
  const updated = n.readAt ? n : await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  return notification(updated);
});
