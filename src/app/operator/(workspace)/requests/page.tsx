import Link from 'next/link';
import { routeSummary } from '@/components/domain/itinerary';
import { categoryLabel, Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Pill, Table } from '@/components/ui/display';
import { formatDate } from '@/lib/time';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Requests' };

export default async function Requests() {
  const { operatorId, membership } = await requireOperatorPage('/operator/requests');
  const items = await prisma.rfqRecipient.findMany({
    where: { operatorId },
    orderBy: { sentAt: 'desc' },
    take: 200,
    include: { rfq: { include: { legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } }, quotes: { where: { operatorId }, select: { status: true } } } } },
  });
  return (
    <>
      <PageHeader eyebrow="Business" title="Requests" lede="Requests are routed to you when one of your approved aircraft fits. Customer contact details are shared once a booking is made." />
      {membership.operator.lifecycle !== 'ACTIVE' && items.length === 0 ? (
        <EmptyState title="Requests start once you are active">Complete verification and sign your agreement. Then approved aircraft start matching requests.</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState title="No requests yet">Keep your fleet approved and availability current to match more requests.</EmptyState>
      ) : (
        <Table head={['Reference', 'Route', 'Departs', 'Pax', 'Preference', 'Your response', 'Request']}>
          {items.map((r) => (
            <tr key={r.id} className={r.status === 'SENT' ? 'font-medium' : ''}>
              <td><Link href={`/operator/requests/${r.rfq.reference}`} className="strip text-sectional underline underline-offset-4">{r.rfq.reference}</Link></td>
              <td className="strip">{routeSummary(r.rfq.legs)}</td>
              <td>{r.rfq.legs[0] && formatDate(r.rfq.legs[0].departureDate)}</td>
              <td className="strip">{r.rfq.passengers}</td>
              <td className="text-sm">{r.rfq.categoryPreference ? categoryLabel(r.rfq.categoryPreference) : 'Any'}</td>
              <td>{r.status === 'SENT' ? <Pill tone="accent">New</Pill> : r.status === 'QUOTED' ? <Pill tone="info">Quoted ({r.rfq.quotes.length})</Pill> : <Pill>{r.status.toLowerCase()}</Pill>}</td>
              <td><Status kind="rfq" value={r.rfq.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
