import { ConsoleShell } from '@/components/domain/console-shell';
import { Status } from '@/components/domain/status';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { switchOperatorAction } from '../actions';

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { viewer, membership, operatorId } = await requireOperatorPage('/operator');
  const [newRequests, pendingBookings, enquiries] = await Promise.all([
    prisma.rfqRecipient.count({ where: { operatorId, status: 'SENT', rfq: { status: { in: ['AWAITING_QUOTES', 'QUOTES_AVAILABLE', 'MATCHING'] } } } }),
    prisma.booking.count({ where: { operatorId, status: 'PENDING_OPERATOR_CONFIRMATION' } }),
    prisma.emptyLegEnquiry.count({ where: { status: 'NEW', listing: { operatorId } } }),
  ]);
  return (
    <ConsoleShell
      title="Operator workspace"
      context={
        <div className="flex flex-col gap-2">
          <p className="font-medium text-paper">{membership.operator.displayName}</p>
          <div className="[&_span]:!bg-paper/10 [&_span]:!text-paper/80">
            <Status kind="operator" value={membership.operator.lifecycle} />
          </div>
          <p className="text-xs text-paper/50">You are {membership.role.toLowerCase()}</p>
          {viewer.memberships.length > 1 && (
            <form action={switchOperatorAction} className="mt-1 flex gap-2">
              <select name="operatorId" defaultValue={operatorId} className="min-w-0 flex-1 bg-night-2 px-2 py-1 text-xs text-paper">
                {viewer.memberships.map((m) => (
                  <option key={m.operatorId} value={m.operatorId}>{m.operator.displayName}</option>
                ))}
              </select>
              <button className="text-xs underline">Switch</button>
            </form>
          )}
        </div>
      }
      groups={[
        { items: [{ href: '/operator', label: 'Overview', exact: true }] },
        { title: 'Business', items: [{ href: '/operator/requests', label: 'Requests', badge: newRequests }, { href: '/operator/bookings', label: 'Bookings', badge: pendingBookings }, { href: '/operator/empty-legs', label: 'Empty legs', badge: enquiries }] },
        { title: 'Fleet', items: [{ href: '/operator/fleet', label: 'Aircraft' }] },
        { title: 'Company', items: [{ href: '/operator/profile', label: 'Profile & team' }, { href: '/operator/verification', label: 'Verification' }, { href: '/operator/agreement', label: 'Agreement' }] },
      ]}
      footer={<a href="/account" className="hover:text-paper">← Personal account</a>}
    >
      {children}
    </ConsoleShell>
  );
}
