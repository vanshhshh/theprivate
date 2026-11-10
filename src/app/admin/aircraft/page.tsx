import Link from 'next/link';
import { Status } from '@/components/domain/status';
import { PageHeader, Pagination, Table } from '@/components/ui/display';
import { AircraftReviewStatus, EvidenceLevel } from '@/generated/prisma/enums';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Aircraft' };

export default async function AdminAircraft({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage('aircraft.read', '/admin/aircraft');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const review = Object.values(AircraftReviewStatus).includes(sp.review as AircraftReviewStatus) ? (sp.review as AircraftReviewStatus) : undefined;
  const evidence = Object.values(EvidenceLevel).includes(sp.evidence as EvidenceLevel) ? (sp.evidence as EvidenceLevel) : undefined;
  const where = {
    deletedAt: null,
    ...(sp.queue ? { reviewStatus: { in: ['SUBMITTED', 'IN_REVIEW'] as AircraftReviewStatus[] } } : review ? { reviewStatus: review } : {}),
    ...(evidence ? { evidenceLevel: evidence } : {}),
    ...(sp.q ? { registration: { contains: sp.q.toUpperCase() } } : {}),
    ...(sp.uncertain ? { attributionUncertain: true } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.aircraft.findMany({ where, orderBy: [{ reviewStatus: 'asc' }, { registration: 'asc' }], take: 50, skip: (page - 1) * 50, include: { operator: { select: { id: true, legalName: true, lifecycle: true } }, aircraftType: { select: { manufacturer: true, model: true } } } }),
    prisma.aircraft.count({ where }),
  ]);
  const qs = (p: number) => `/admin/aircraft?${new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <PageHeader eyebrow="Supply" title="Aircraft" lede={`${total} matching. Imported aircraft stay unreviewed and non-bookable until their operator confirms them and staff approve.`} />
      <form className="mb-8 flex flex-wrap items-end gap-5 text-sm" action="/admin/aircraft">
        <input name="q" defaultValue={sp.q} placeholder="Registration" className="strip border-0 border-b border-line-strong bg-transparent py-2" aria-label="Registration" />
        <select name="review" defaultValue={review ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Review status"><option value="">Any review</option>{Object.values(AircraftReviewStatus).map((r) => <option key={r}>{r}</option>)}</select>
        <select name="evidence" defaultValue={evidence ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Evidence"><option value="">Any evidence</option>{Object.values(EvidenceLevel).map((r) => <option key={r}>{r}</option>)}</select>
        <label className="flex items-center gap-2"><input type="checkbox" name="queue" value="1" defaultChecked={Boolean(sp.queue)} /> Review queue</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="uncertain" value="1" defaultChecked={Boolean(sp.uncertain)} /> Attribution uncertain</label>
        <button className="border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Filter</button>
      </form>
      <Table head={['Registration', 'Type', 'Operator', 'Seats', 'Evidence', 'Review']}>
        {rows.map((a) => (
          <tr key={a.id}>
            <td><Link className="strip underline" href={`/admin/aircraft/${a.id}`}>{a.registration}</Link>{a.attributionUncertain && <span className="block text-xs text-danger">attribution uncertain</span>}</td>
            <td className="text-sm">{a.aircraftType ? `${a.aircraftType.manufacturer} ${a.aircraftType.model}` : <span className="text-muted">{a.modelRaw} ({a.typeResolution.toLowerCase()})</span>}</td>
            <td className="text-sm"><Link className="hover:underline" href={`/admin/operators/${a.operator.id}`}>{a.operator.legalName}</Link></td>
            <td className="strip">{a.seats ?? '—'}</td>
            <td><Status kind="evidence" value={a.evidenceLevel} /></td>
            <td><Status kind="aircraftReview" value={a.reviewStatus} /></td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} perPage={50} href={qs} />
    </>
  );
}
