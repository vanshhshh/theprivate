import { Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Table } from '@/components/ui/display';
import { InlineAction } from '@/components/ui/inline-action';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { emptyLegModerateAction } from '../actions';

export const metadata = { title: 'Empty legs' };

export default async function AdminEmptyLegs() {
  await requirePermissionPage('emptyleg.moderate', '/admin/empty-legs');
  const legs = await prisma.emptyLegListing.findMany({ orderBy: { windowStartUtc: 'desc' }, take: 200, include: { operator: { select: { legalName: true } }, aircraft: { select: { registration: true } }, fromAirport: true, toAirport: true, _count: { select: { enquiries: true } } } });
  const now = new Date();
  return (
    <>
      <PageHeader eyebrow="Demand" title="Empty legs" lede="Published directly by active operators for approved aircraft. Withdraw anything that looks wrong." />
      {legs.length === 0 ? <EmptyState title="No empty legs published yet" /> : (
        <Table head={['Route', 'Window', 'Operator', 'Aircraft', 'Price', 'Enquiries', 'Status', '']}>
          {legs.map((l) => (
            <tr key={l.id}>
              <td className="strip">{l.fromAirport.iata ?? l.fromAirport.icao} → {l.toAirport.iata ?? l.toAirport.icao}</td>
              <td className="text-sm">{formatDateTime(l.windowStartUtc, l.fromAirport.timezone ?? 'UTC')}</td>
              <td className="text-sm">{l.operator.legalName}</td>
              <td className="strip">{l.aircraft.registration}</td>
              <td className="strip text-sm">{l.customerPrice ? formatMoney(l.customerPrice.toString(), l.currency) : 'On request'}</td>
              <td className="strip">{l._count.enquiries}</td>
              <td><Status kind="emptyLeg" value={l.status === 'PUBLISHED' && l.validUntil < now ? 'EXPIRED' : l.status} /></td>
              <td>{l.status === 'PUBLISHED' && l.validUntil > now && <InlineAction action={emptyLegModerateAction} hidden={{ id: l.id }} label="Withdraw" variant="danger" confirm="Withdraw this listing from the marketplace?" />}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
