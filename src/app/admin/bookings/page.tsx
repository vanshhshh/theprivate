import Link from 'next/link';
import { routeSummary } from '@/components/domain/itinerary';
import { Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Table } from '@/components/ui/display';
import { BookingStatus } from '@/generated/prisma/enums';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Bookings' };

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermissionPage('booking.read', '/admin/bookings');
  const sp = await searchParams;
  const status = Object.values(BookingStatus).includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined;
  const rows = await prisma.booking.findMany({ where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, take: 200, include: { customer: { select: { name: true } }, operator: { select: { legalName: true } }, legs: { orderBy: { sequence: 'asc' }, include: { fromAirport: true, toAirport: true } } } });
  return (
    <>
      <PageHeader eyebrow="Demand" title="Bookings" />
      <form className="mb-8 flex gap-4 text-sm" action="/admin/bookings">
        <select name="status" defaultValue={status ?? ''} className="border-0 border-b border-line-strong bg-transparent py-2" aria-label="Status"><option value="">Any status</option>{Object.values(BookingStatus).map((s) => <option key={s}>{s}</option>)}</select>
        <button className="border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState title="No bookings" /> : (
        <Table head={['Booking', 'Customer', 'Operator', 'Route', 'Departs', 'Total', 'Status']}>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><Link className="strip underline" href={`/admin/bookings/${b.reference}`}>{b.reference}</Link></td>
              <td className="text-sm">{b.customer.name}</td>
              <td className="text-sm">{b.operator.legalName}</td>
              <td className="strip">{routeSummary(b.legs)}</td>
              <td>{b.legs[0] && formatDate(b.legs[0].departureDate)}</td>
              <td className="strip">{formatMoney(b.customerTotal.toString(), b.currency)}</td>
              <td><Status kind="booking" value={b.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
