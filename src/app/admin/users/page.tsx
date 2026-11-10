import { PageHeader, Pagination, Pill, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { StaffRole } from '@/generated/prisma/enums';
import { formatDate } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { roleGrantAction, roleRevokeAction, userDisableAction } from '../actions';

export const metadata = { title: 'Users & roles' };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const v = await requirePermissionPage('user.manage', '/admin/users');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { OR: [{ email: { contains: sp.q, mode: 'insensitive' as const } }, { name: { contains: sp.q, mode: 'insensitive' as const } }] } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, skip: (page - 1) * 50, include: { staffRoles: { where: { revokedAt: null } }, memberships: { where: { status: 'ACTIVE' }, include: { operator: { select: { displayName: true } } } } } }),
    prisma.user.count({ where }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Platform" title="Users & roles" lede="Staff roles carry narrow permission sets. Only super admins manage roles; every change is audited." />
      <section className="mb-12">
        <SectionTitle>Grant a staff role</SectionTitle>
        <ActionForm action={roleGrantAction} resetOnSuccess className="grid max-w-3xl gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <Field name="email" label="User e-mail"><Input name="email" type="email" required /></Field>
          <Field name="role" label="Role"><Select name="role" defaultValue="SUPPORT">{Object.values(StaffRole).map((r) => <option key={r} value={r}>{r.toLowerCase().replace('_', ' ')}</option>)}</Select></Field>
          <SubmitButton variant="secondary">Grant</SubmitButton>
        </ActionForm>
      </section>
      <form className="mb-6" action="/admin/users"><input name="q" defaultValue={sp.q} placeholder="Search name or e-mail" className="w-72 border-0 border-b border-line-strong bg-transparent py-2" aria-label="Search users" /></form>
      <Table head={['User', 'Joined', 'Staff roles', 'Operator memberships', 'Status']}>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.name}<span className="block text-xs text-muted">{u.email}</span></td>
            <td className="text-sm">{formatDate(u.createdAt)}</td>
            <td>
              <div className="flex flex-col gap-2">
                {u.staffRoles.map((r) => (
                  <div key={r.id} className="flex items-center gap-2"><Pill tone="info">{r.role.toLowerCase().replace('_', ' ')}</Pill><InlineAction action={roleRevokeAction} hidden={{ assignmentId: r.id }} label="Revoke" variant="ghost" confirm={`Revoke ${r.role} from ${u.name}?`} /></div>
                ))}
              </div>
            </td>
            <td className="text-sm">{u.memberships.map((m) => `${m.operator.displayName} (${m.role.toLowerCase()})`).join(', ') || '—'}</td>
            <td>{u.id === v.user.id ? <span className="text-xs text-muted">You</span> : <InlineAction action={userDisableAction} hidden={{ userId: u.id, disabled: u.disabledAt ? 'false' : 'true' }} label={u.disabledAt ? 'Enable' : 'Disable'} variant={u.disabledAt ? 'secondary' : 'danger'} confirm={u.disabledAt ? 'Re-enable this account?' : 'Disable this account and end its sessions?'} />}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} perPage={50} href={(p) => `/admin/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} />
    </>
  );
}
