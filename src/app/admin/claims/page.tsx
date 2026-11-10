import Link from 'next/link';
import { Status } from '@/components/domain/status';
import { EmptyState, PageHeader, Table } from '@/components/ui/display';
import { formatDate } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Claims' };

export default async function Claims() {
  await requirePermissionPage('claim.review', '/admin/claims');
  const claims = await prisma.operatorClaim.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200, include: { user: { select: { name: true, email: true } }, operator: { select: { legalName: true, lifecycle: true } } } });
  return (
    <>
      <PageHeader eyebrow="Supply" title="Operator claims" lede="Approving a claim grants the claimant OWNER access and moves a DISCOVERED operator to CLAIMED. It does not verify the operator." />
      {claims.length === 0 ? <EmptyState title="No claims yet" /> : (
        <Table head={['Submitted', 'Company', 'Claimant', 'Role', 'Work e-mail', 'Status']}>
          {claims.map((c) => (
            <tr key={c.id}>
              <td>{formatDate(c.createdAt)}</td>
              <td><Link href={`/admin/claims/${c.id}`} className="underline underline-offset-4">{c.operator?.legalName ?? `New: ${c.proposedName}`}</Link></td>
              <td>{c.user.name}<span className="block text-xs text-muted">{c.user.email}</span></td>
              <td className="text-sm">{c.claimantRole}</td>
              <td className="text-sm">{c.workEmail}</td>
              <td><Status kind="claim" value={c.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
