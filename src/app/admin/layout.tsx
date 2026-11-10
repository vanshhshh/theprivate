import { ConsoleShell } from '@/components/domain/console-shell';
import type { NavItem } from '@/components/domain/sub-nav';
import type { Permission } from '@/server/auth/permissions';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const v = await requirePermissionPage('admin.access', '/admin');
  const has = (p: Permission) => v.permissions.has(p);
  const [claims, aircraft, listings, unmatched, conflicts, messages] = await Promise.all([
    has('claim.review') ? prisma.operatorClaim.count({ where: { status: 'SUBMITTED' } }) : 0,
    has('aircraft.review') ? prisma.aircraft.count({ where: { reviewStatus: { in: ['SUBMITTED', 'IN_REVIEW'] } } }) : 0,
    has('sale.review') ? prisma.saleListing.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }) : 0,
    has('rfq.read') ? prisma.rfq.count({ where: { status: 'MATCHING' } }) : 0,
    has('data.read') ? prisma.dataConflict.count({ where: { status: 'OPEN' } }) : 0,
    has('customer.read') ? prisma.contactMessage.count({ where: { handledAt: null } }) : 0,
  ]);
  const item = (p: Permission, it: NavItem) => (has(p) ? [it] : []);
  return (
    <ConsoleShell
      title="Admin console"
      context={<p className="text-xs text-paper/60">{v.user.name} · {v.roles.map((r) => r.toLowerCase().replace('_', ' ')).join(', ')}</p>}
      groups={[
        { items: [{ href: '/admin', label: 'Overview', exact: true }] },
        { title: 'Supply', items: [...item('operator.read', { href: '/admin/operators', label: 'Operators' }), ...item('claim.review', { href: '/admin/claims', label: 'Claims', badge: claims }), ...item('invite.manage', { href: '/admin/invitations', label: 'Invitations' }), ...item('onboarding_payment.read', { href: '/admin/onboarding-payments', label: 'Onboarding fees' }), ...item('aircraft.read', { href: '/admin/aircraft', label: 'Aircraft', badge: aircraft })] },
        { title: 'Demand', items: [...item('rfq.read', { href: '/admin/requests', label: 'Requests', badge: unmatched }), ...item('booking.read', { href: '/admin/bookings', label: 'Bookings' }), ...item('emptyleg.moderate', { href: '/admin/empty-legs', label: 'Empty legs' }), ...item('customer.read', { href: '/admin/messages', label: 'Messages', badge: messages })] },
        { title: 'Sales', items: item('sale.review', { href: '/admin/sales', label: 'Aircraft for sale', badge: listings }) },
        { title: 'Data', items: [...item('data.read', { href: '/admin/data', label: 'Imports & provenance', exact: true }), ...item('data.read', { href: '/admin/data/conflicts', label: 'Conflicts', badge: conflicts }), ...item('data.read', { href: '/admin/data/matches', label: 'Identity matches' }), ...item('aircraft.read', { href: '/admin/data/types', label: 'Aircraft types' })] },
        { title: 'Platform', items: [...item('user.manage', { href: '/admin/users', label: 'Users & roles' }), ...item('audit.read', { href: '/admin/audit', label: 'Audit log' }), ...item('settings.manage', { href: '/admin/settings', label: 'Settings' })] },
      ].filter((g) => g.items.length)}
      footer={<a href="/account" className="hover:text-paper">← Personal account</a>}
    >
      {children}
    </ConsoleShell>
  );
}
