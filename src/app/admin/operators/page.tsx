import Link from 'next/link';
import { Status } from '@/components/domain/status';
import { PageHeader, Pagination, Pill, Table } from '@/components/ui/display';
import { OperatorLifecycle } from '@/generated/prisma/enums';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Operators' };

export default async function AdminOperators({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage('operator.read', '/admin/operators');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const lifecycle = Object.values(OperatorLifecycle).includes(sp.lifecycle as OperatorLifecycle) ? (sp.lifecycle as OperatorLifecycle) : undefined;
  const where = {
    deletedAt: null,
    ...(lifecycle ? { lifecycle } : {}),
    ...(sp.country ? { countryCode: sp.country } : {}),
    ...(sp.q ? { OR: [{ legalName: { contains: sp.q, mode: 'insensitive' as const } }, { displayName: { contains: sp.q, mode: 'insensitive' as const } }] } : {}),
    ...(sp.flagged ? { NOT: { dataQualityFlags: { isEmpty: true } } } : {}),
    ...(sp.relevance ? { researchRelevance: sp.relevance } : {}),
  };
  const [ops, total] = await Promise.all([
    prisma.operator.findMany({ where, orderBy: [{ lifecycle: 'desc' }, { legalName: 'asc' }], take: 50, skip: (page - 1) * 50, include: { _count: { select: { aircraft: true, memberships: { where: { status: 'ACTIVE' } } } }, authorizations: { select: { authority: true, numberRaw: true, numberStatus: true } } } }),
    prisma.operator.count({ where }),
  ]);
  const qs = (p: number) => `/admin/operators?${new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <PageHeader eyebrow="Supply" title="Operators" lede={`${total} matching`} />
      <form className="mb-8 flex flex-wrap items-end gap-5 text-sm" action="/admin/operators">
        <input name="q" defaultValue={sp.q} placeholder="Search name" className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Search name" />
        <select name="lifecycle" defaultValue={lifecycle ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Lifecycle"><option value="">Any stage</option>{Object.values(OperatorLifecycle).map((l) => <option key={l} value={l}>{l}</option>)}</select>
        <select name="country" defaultValue={sp.country ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Country"><option value="">Any country</option><option value="IN">IN</option><option value="AE">AE</option></select>
        <select name="relevance" defaultValue={sp.relevance ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Research relevance"><option value="">Any relevance</option>{['A', 'B', 'C', 'D', 'Confirmed'].map((r) => <option key={r}>{r}</option>)}</select>
        <label className="flex items-center gap-2"><input type="checkbox" name="flagged" value="1" defaultChecked={Boolean(sp.flagged)} /> Data-quality flags</label>
        <button className="border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Filter</button>
      </form>
      <Table head={['Operator', 'Country', 'Certificate', 'Research', 'Aircraft', 'Members', 'Stage']}>
        {ops.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/operators/${o.id}`} className="underline underline-offset-4">{o.legalName}</Link>{o.dataQualityFlags.length > 0 && <span className="ml-2"><Pill tone="danger">{o.dataQualityFlags.length} flag{o.dataQualityFlags.length > 1 ? 's' : ''}</Pill></span>}</td>
            <td className="strip">{o.countryCode}</td>
            <td className="strip text-xs">{o.authorizations.map((a) => `${a.authority} ${a.numberStatus === 'VALID' ? a.numberRaw : '⚠ malformed'}`).join(', ')}</td>
            <td className="strip">{o.researchRelevance ?? '—'}</td>
            <td className="strip">{o._count.aircraft}</td>
            <td className="strip">{o._count.memberships}</td>
            <td><Status kind="operator" value={o.lifecycle} /></td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} perPage={50} href={qs} />
    </>
  );
}
