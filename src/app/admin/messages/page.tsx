import { EmptyState, PageHeader, Table } from '@/components/ui/display';
import { InlineAction } from '@/components/ui/inline-action';
import { formatDateTime } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { messageHandledAction } from '../actions';

export const metadata = { title: 'Messages' };

export default async function Messages() {
  await requirePermissionPage('customer.read', '/admin/messages');
  const rows = await prisma.contactMessage.findMany({ orderBy: [{ handledAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }], take: 200 });
  return (
    <>
      <PageHeader eyebrow="Demand" title="Contact messages" lede="Reply from your e-mail client; mark handled here so the team knows." />
      {rows.length === 0 ? <EmptyState title="No messages" /> : (
        <Table head={['Received', 'Topic', 'From', 'Message', '']}>
          {rows.map((m) => (
            <tr key={m.id} className={m.handledAt ? 'text-muted' : ''}>
              <td className="strip text-xs">{formatDateTime(m.createdAt)}</td>
              <td className="text-xs">{m.topic.toLowerCase()}</td>
              <td className="text-sm">{m.name}<a className="block text-xs underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <span className="block text-xs">{m.phone}</span>}</td>
              <td className="max-w-xl whitespace-pre-line text-sm">{m.message}</td>
              <td>{m.handledAt ? <span className="text-xs">Handled</span> : <InlineAction action={messageHandledAction} hidden={{ id: m.id }} label="Mark handled" variant="ghost" />}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
