import Link from 'next/link';
import { Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Table } from '@/components/ui/display';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Aircraft for sale' };

export default async function AdminSales() {
  await requirePermissionPage('sale.review', '/admin/sales');
  const rows = await prisma.saleListing.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200, include: { seller: { select: { name: true } }, _count: { select: { enquiries: true } } } });
  return (
    <>
      <PageHeader eyebrow="Sales desk" title="Aircraft-for-sale listings" lede="Nothing is public until published here. Seller contact details are never shown to buyers." />
      {rows.length === 0 ? <EmptyState title="No submissions yet" /> : (
        <Table head={['Submitted', 'Aircraft', 'Seller', 'Price', 'Enquiries', 'Status']}>
          {rows.map((l) => (
            <tr key={l.id}>
              <td>{formatDate(l.createdAt)}</td>
              <td><Link href={`/admin/sales/${l.id}`} className="underline underline-offset-4">{l.yearOfManufacture} {l.manufacturer} {l.model}</Link><span className="block text-xs text-muted">{l.headline}</span></td>
              <td className="text-sm">{l.seller.name} · {l.sellerType.toLowerCase()}</td>
              <td className="strip text-sm">{l.priceOnRequest || !l.askingPrice ? 'On request' : formatMoney(l.askingPrice.toString(), l.currency, 'en-US')}</td>
              <td className="strip">{l._count.enquiries}</td>
              <td><Status kind="listing" value={l.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
