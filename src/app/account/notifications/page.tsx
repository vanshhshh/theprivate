import { EmptyState, PageHeader } from '@/components/ui/display';
import { formatDateTime } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { markAllReadAction, openNotificationAction } from '../actions';

export const metadata = { title: 'Inbox' };

export default async function Inbox() {
  const v = await requireViewerPage('/account/notifications');
  const items = await prisma.notification.findMany({ where: { userId: v.user.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { deliveries: { select: { channel: true, status: true } } } });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        eyebrow="Your journeys"
        title="Inbox"
        lede="Updates about your requests, offers, trips and listings."
        actions={
          unread > 0 ? (
            <form action={markAllReadAction}>
              <button className="text-sm text-sectional underline underline-offset-4">Mark all as read</button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">Updates about your flights and listings will appear here.</EmptyState>
      ) : (
        <ul className="divide-y divide-line border-y border-ink">
          {items.map((n) => (
            <li key={n.id}>
              <form action={openNotificationAction}>
                <input type="hidden" name="id" value={n.id} />
                <button className="grid w-full grid-cols-[10px_1fr_auto] items-start gap-5 px-2 py-5 text-left transition-colors hover:bg-paper-2/60">
                  <span className={`mt-2 size-2 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-magenta'}`} aria-label={n.readAt ? 'Read' : 'Unread'} />
                  <span>
                    <span className={`block ${n.readAt ? '' : 'font-semibold'}`}>{n.title}</span>
                    <span className="block text-sm text-muted">{n.body}</span>
                    {n.deliveries.some((d) => d.status === 'SKIPPED_NOT_CONFIGURED') && <span className="mt-1 block text-xs text-muted">E-mail copy not sent: e-mail delivery is not configured yet.</span>}
                  </span>
                  <span className="strip text-xs text-muted">{formatDateTime(n.createdAt, v.user.timezone)}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
