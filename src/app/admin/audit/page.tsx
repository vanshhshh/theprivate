import { PageHeader, Pagination, Table } from '@/components/ui/display';
import { formatDateTime } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Audit log' };

export default async function Audit({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string; page?: string }> }) {
  await requirePermissionPage('audit.read', '/admin/audit');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(sp.action ? { action: { startsWith: sp.action } } : {}), ...(sp.entity ? { entityId: sp.entity } : {}) };
  const [rows, total] = await Promise.all([
    prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, skip: (page - 1) * 100, include: { actor: { select: { name: true, email: true } } } }),
    prisma.auditEvent.count({ where }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Platform" title="Audit log" lede="Append-only record of sensitive actions." />
      <form className="mb-6 flex gap-4 text-sm" action="/admin/audit">
        <input name="action" defaultValue={sp.action} placeholder="Action prefix, e.g. operator." className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Action prefix" />
        <input name="entity" defaultValue={sp.entity} placeholder="Entity id" className="strip border-0 border-b border-line-strong bg-transparent py-2" aria-label="Entity id" />
        <button className="border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Filter</button>
      </form>
      <Table head={['When', 'Actor', 'Action', 'Entity', 'Details', 'IP']}>
        {rows.map((a) => (
          <tr key={a.id}>
            <td className="strip text-xs">{formatDateTime(a.createdAt)}</td>
            <td className="text-sm">{a.actor ? a.actor.name : a.actorType.toLowerCase()}</td>
            <td className="strip text-xs">{a.action}</td>
            <td className="strip text-xs">{a.entityType}:{a.entityId.slice(-8)}</td>
            <td className="max-w-md truncate text-xs text-muted" title={JSON.stringify(a.after)}>{a.after ? JSON.stringify(a.after) : ''}</td>
            <td className="strip text-xs">{a.ipAddress ?? '—'}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} perPage={100} href={(p) => `/admin/audit?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), ...(sp.entity ? { entity: sp.entity } : {}), page: String(p) })}`} />
    </>
  );
}
