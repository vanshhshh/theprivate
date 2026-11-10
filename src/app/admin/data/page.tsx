import { PageHeader, SectionTitle, Table } from '@/components/ui/display';
import { formatDate, formatDateTime } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Imports & provenance' };

export default async function DataHome() {
  await requirePermissionPage('data.read', '/admin/data');
  const [batches, sources, registry, evidence, records] = await Promise.all([
    prisma.importBatch.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }),
    prisma.dataSource.findMany({ orderBy: { code: 'asc' }, include: { _count: { select: { records: true } } } }),
    prisma.authorityRegistryEntry.findMany({ orderBy: { approvalNumber: 'asc' }, include: { operator: { select: { legalName: true } } } }),
    prisma.evidenceSource.count(),
    prisma.sourceRecord.count(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Data" title="Imports & provenance" lede={`${records.toLocaleString('en-IN')} source rows preserved verbatim · ${evidence} evidence sources. Imports run from the CLI with a reviewed plan hash (see docs/DATA_AUDIT.md).`} />
      <section className="mb-14">
        <SectionTitle>Import batches</SectionTitle>
        <Table head={['Started', 'Mode', 'Status', 'Plan hash', 'Initiated by', 'Summary']}>
          {batches.map((b) => (
            <tr key={b.id}>
              <td className="text-sm">{formatDateTime(b.startedAt)}</td>
              <td className="text-sm">{b.mode}</td>
              <td className="text-sm">{b.status}{b.error ? <span className="block text-xs text-danger">{b.error}</span> : null}</td>
              <td className="strip text-xs">{b.planHash.slice(0, 16)}…</td>
              <td className="text-sm">{b.initiatedBy}</td>
              <td className="text-xs">{Array.isArray(b.summary) ? (b.summary as { entity: string; create: number; update: number }[]).filter((s) => s.create || s.update).map((s) => `${s.entity} +${s.create}${s.update ? ` ~${s.update}` : ''}`).join(' · ') : '—'}</td>
            </tr>
          ))}
        </Table>
      </section>
      <section className="mb-14">
        <SectionTitle>Data sources</SectionTitle>
        <Table head={['Code', 'File', 'Role', 'As of', 'Rows', 'SHA-256']}>
          {sources.map((s) => (
            <tr key={s.id}><td className="strip text-xs">{s.code}</td><td className="text-sm">{s.fileName}</td><td className="text-xs">{s.role}</td><td className="text-sm">{s.asOf ? formatDate(s.asOf) : '—'}</td><td className="strip">{s._count.records}</td><td className="strip text-xs">{s.latestSha256.slice(0, 12)}…</td></tr>
          ))}
        </Table>
      </section>
      <section>
        <SectionTitle>GCAA approved air operators (registry)</SectionTitle>
        <Table head={['Approval', 'Organisation', 'Valid', 'Linked operator']}>
          {registry.map((r) => (
            <tr key={r.id}><td className="strip">{r.approvalNumberRaw}</td><td>{r.organizationName}</td><td className="text-sm">{r.issueDate ? formatDate(r.issueDate) : '?'} → {r.expiryDate ? formatDate(r.expiryDate) : '?'}</td><td className="text-sm">{r.operator?.legalName ?? <span className="text-muted">Registry only</span>}</td></tr>
          ))}
        </Table>
      </section>
    </>
  );
}
