import Link from 'next/link';
import { routeSummary } from '@/components/domain/itinerary';
import { Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Table } from '@/components/ui/display';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Bookings' };

export default async function OperatorBookings() {
  const { operatorId } = await requireOperatorPage('/operator/bookings');
  const bookings = await prisma.booking.findMany({
    where: { operatorId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } }, aircraft: { select: { registration: true } }, quoteRevision: { select: { operatorPrice: true, currency: true } } },
  });
  return (
    <>
      <PageHeader eyebrow="Business" title="Bookings" />
      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet">When a customer accepts one of your quotes it appears here for confirmation.</EmptyState>
      ) : (
        <Table head={['Booking', 'Route', 'Departs', 'Aircraft', 'Your price', 'Status']}>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/operator/bookings/${b.reference}`} className="strip text-sectional underline underline-offset-4">{b.reference}</Link></td>
              <td className="strip">{routeSummary(b.legs)}</td>
              <td>{b.legs[0] && formatDate(b.legs[0].departureDate)}</td>
              <td className="strip">{b.aircraft.registration}</td>
              <td className="strip">{formatMoney(b.quoteRevision.operatorPrice.toString(), b.quoteRevision.currency)}</td>
              <td><Status kind="booking" value={b.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
