import Link from 'next/link';
import { routeSummary } from '@/components/domain/itinerary';
import { Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Pagination, Table } from '@/components/ui/display';
import { RfqStatus } from '@/generated/prisma/enums';
import { formatDate } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Requests' };

export default async function AdminRequests({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage('rfq.read', '/admin/requests');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = Object.values(RfqStatus).includes(sp.status as RfqStatus) ? (sp.status as RfqStatus) : undefined;
  const where = { ...(status ? { status } : {}), ...(sp.q ? { reference: { contains: sp.q.toUpperCase() } } : {}) };
  const [rows, total] = await Promise.all([
    prisma.rfq.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, skip: (page - 1) * 50, include: { customer: { select: { name: true } }, legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } }, _count: { select: { recipients: true, quotes: true } } } }),
    prisma.rfq.count({ where }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Demand" title="Requests" lede={`${total} matching`} />
      <form className="mb-8 flex flex-wrap items-end gap-5 text-sm" action="/admin/requests">
        <input name="q" defaultValue={sp.q} placeholder="Reference" className="strip border-0 border-b border-line-strong bg-transparent py-2" aria-label="Reference" />
        <select name="status" defaultValue={status ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Status"><option value="">Any status</option>{Object.values(RfqStatus).map((s) => <option key={s}>{s}</option>)}</select>
        <button className="border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No requests" /> : (
        <Table head={['Reference', 'Customer', 'Route', 'Departs', 'Pax', 'Routed to', 'Quotes', 'Status']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/requests/${r.reference}`} className="strip underline">{r.reference}</Link></td>
              <td className="text-sm">{r.customer.name}</td>
              <td className="strip">{routeSummary(r.legs)}</td>
              <td>{r.legs[0] && formatDate(r.legs[0].departureDate)}</td>
              <td className="strip">{r.passengers}</td>
              <td className="strip">{r._count.recipients}</td>
              <td className="strip">{r._count.quotes}</td>
              <td><Status kind="rfq" value={r.status} /></td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} total={total} perPage={50} href={(p) => `/admin/requests?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`} />
    </>
  );
}
