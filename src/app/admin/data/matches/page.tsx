import Link from 'next/link';
import { PageHeader, Pill } from '@/components/ui/display';
import { ActionForm, Field, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { matchAction } from '../../actions';

export const metadata = { title: 'Identity matches' };

export default async function Matches({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requirePermissionPage('data.read', '/admin/data/matches');
  const sp = await searchParams;
  const status = sp.status === 'CONFIRMED_SAME' || sp.status === 'CONFIRMED_DISTINCT' ? sp.status : 'PENDING';
  const rows = await prisma.matchCandidate.findMany({ where: { status }, orderBy: { score: 'desc' } });
  const keys = [...new Set(rows.flatMap((r) => [r.leftKey, r.rightKey]))];
  const ext = await prisma.externalIdentifier.findMany({ where: { OR: keys.map((k) => ({ namespace: k.split(':')[0]!, value: k.split(':').slice(1).join(':') })) } });
  const ops = await prisma.operator.findMany({ where: { id: { in: ext.map((e) => e.entityId) } }, include: { _count: { select: { aircraft: true, memberships: true } }, authorizations: { select: { numberRaw: true, numberStatus: true } } } });
  const opByKey = new Map(ext.map((e) => [`${e.namespace}:${e.value}`, ops.find((o) => o.id === e.entityId)]));
  const tone = (r: string) => (r === 'LIKELY_SAME' ? 'indicative' : r === 'LIKELY_DISTINCT' ? 'unconfirmed' : 'neutral') as 'indicative' | 'unconfirmed' | 'neutral';
  return (
    <>
      <PageHeader eyebrow="Data" title="Operator identity matches" lede="Possible duplicates found during import. Nothing was merged automatically. Merging moves aircraft, contacts, aliases and identifiers to the kept record, and is refused if the other record has members or commercial activity." />
      <nav className="mb-8 flex gap-5 text-sm" aria-label="Match status">
        {['PENDING', 'CONFIRMED_SAME', 'CONFIRMED_DISTINCT'].map((s) => <Link key={s} href={`/admin/data/matches?status=${s}`} className={s === status ? 'border-b-2 border-ink pb-1' : 'text-muted hover:text-ink'}>{s.toLowerCase().replace('_', ' ')}</Link>)}
      </nav>
      {rows.length === 0 && <p className="text-muted">None.</p>}
      <ul className="flex flex-col gap-10">
        {rows.map((m) => {
          const side = (k: string) => {
            const o = opByKey.get(k);
            return (
              <div className="bg-paper-2 p-4 text-sm">
                <p className="strip text-xs text-muted">{k}</p>
                {o ? (
                  <>
                    <Link className="font-medium underline" href={`/admin/operators/${o.id}`}>{o.legalName}</Link>
                    <p className="mt-1 text-xs text-muted">{o.authorizations.map((a) => (a.numberStatus === 'VALID' ? a.numberRaw : '⚠ malformed permit')).join(', ')} · {o._count.aircraft} aircraft · {o._count.memberships} members{o.deletedAt ? ' · merged away' : ''}</p>
                  </>
                ) : <p className="text-muted">Record not found</p>}
              </div>
            );
          };
          return (
            <li key={m.id} className="border-t border-ink pt-4">
              <div className="mb-3 flex flex-wrap items-center gap-3"><Pill tone={tone(m.recommendation)}>{m.recommendation.toLowerCase().replace('_', ' ')}</Pill><span className="strip text-sm">score {m.score.toString()}</span></div>
              <div className="grid gap-3 md:grid-cols-2">{side(m.leftKey)}{side(m.rightKey)}</div>
              <p className="mt-3 text-sm text-ink-2">{m.reasons.join(' · ')}</p>
              {m.note && <p className="mt-2 text-sm">Decision note: {m.note}</p>}
              {status === 'PENDING' && can(v, 'data.resolve') && (
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {can(v, 'operator.merge') && (
                    <ActionForm action={matchAction} className="flex flex-col gap-4">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="decision" value="CONFIRMED_SAME" />
                      <Field name="keep" label="Same company: keep which record?"><Select name="keep" required defaultValue=""><option value="">Choose…</option><option value={m.leftKey}>{opByKey.get(m.leftKey)?.legalName ?? m.leftKey} ({m.leftKey})</option><option value={m.rightKey}>{opByKey.get(m.rightKey)?.legalName ?? m.rightKey} ({m.rightKey})</option></Select></Field>
                      <Field name="note" label="Evidence"><Textarea name="note" rows={2} required /></Field>
                      <SubmitButton variant="secondary">Merge records</SubmitButton>
                    </ActionForm>
                  )}
                  <ActionForm action={matchAction} className="flex flex-col gap-4">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="decision" value="CONFIRMED_DISTINCT" />
                    <Field name="note" label="Different companies: why?"><Textarea name="note" rows={2} required /></Field>
                    <SubmitButton variant="ghost">Mark distinct</SubmitButton>
                  </ActionForm>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
