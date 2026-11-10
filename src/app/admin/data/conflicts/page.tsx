import Link from 'next/link';
import { Status } from '@/components/domain/status';
import { PageHeader } from '@/components/ui/display';
import { ActionForm, Field, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { conflictAction } from '../../actions';

export const metadata = { title: 'Data conflicts' };

type Val = { value: unknown; source: string; sheet: string; row: number; trust: number };

export default async function Conflicts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requirePermissionPage('data.read', '/admin/data/conflicts');
  const sp = await searchParams;
  const status = sp.status === 'AUTO_RESOLVED' || sp.status === 'RESOLVED' || sp.status === 'DISMISSED' ? sp.status : 'OPEN';
  const rows = await prisma.dataConflict.findMany({ where: { status }, orderBy: [{ entityType: 'asc' }, { entityKey: 'asc' }], take: 200 });
  const entityHref = (c: (typeof rows)[number]) => (!c.entityId ? null : c.entityType === 'OPERATOR' ? `/admin/operators/${c.entityId}` : c.entityType === 'AIRCRAFT' ? `/admin/aircraft/${c.entityId}` : null);
  return (
    <>
      <PageHeader eyebrow="Data" title="Conflicts" lede="Where sources disagree, every value is preserved. Open conflicts had no safe automatic choice; auto-resolved ones kept the higher-trust source and can be overridden." />
      <nav className="mb-8 flex gap-5 text-sm" aria-label="Conflict status">
        {['OPEN', 'AUTO_RESOLVED', 'RESOLVED', 'DISMISSED'].map((s) => (
          <Link key={s} href={`/admin/data/conflicts?status=${s}`} className={s === status ? 'border-b-2 border-ink pb-1' : 'text-muted hover:text-ink'}>{s.toLowerCase().replace('_', ' ')}</Link>
        ))}
      </nav>
      {rows.length === 0 && <p className="text-muted">None.</p>}
      <ul className="flex flex-col gap-8">
        {rows.map((c) => {
          const values = c.values as Val[];
          const href = entityHref(c);
          return (
            <li key={c.id} className="border-t border-ink pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p><span className="strip text-sm">{href ? <Link className="underline" href={href}>{c.entityKey}</Link> : c.entityKey}</span> · <span className="font-medium">{c.field}</span></p>
                <Status kind="conflict" value={c.status} />
              </div>
              <p className="mt-1 text-sm text-muted">{c.reason}</p>
              <ul className="mt-3 text-sm">
                {values.map((x, i) => (
                  <li key={i} className="grid grid-cols-[1fr_auto] gap-4 border-b border-line py-1.5">
                    <span>{JSON.stringify(x.value)}</span>
                    <span className="strip text-xs text-muted">{x.source} › {x.sheet} › r{x.row} · trust {x.trust}</span>
                  </li>
                ))}
              </ul>
              {can(v, 'data.resolve') && (c.status === 'OPEN' || c.status === 'AUTO_RESOLVED') && (
                <ActionForm action={conflictAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <input type="hidden" name="id" value={c.id} />
                  <Field name="chosen" label="Accepted value">
                    <Select name="chosen" defaultValue="">
                      <option value="">None (dismiss)</option>
                      {[...new Set(values.map((x) => String(x.value)))].map((x) => <option key={x} value={x}>{x.slice(0, 80)}</option>)}
                    </Select>
                  </Field>
                  <Field name="note" label="Why"><Textarea name="note" rows={1} required /></Field>
                  <div className="flex gap-2">
                    <SubmitButton variant="secondary">Record decision</SubmitButton>
                  </div>
                </ActionForm>
              )}
              {c.resolutionNote && <p className="mt-2 text-sm">Decision: {c.resolutionNote}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
