import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Status } from '@/components/domain/status';
import { DL, Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { InlineAction } from '@/components/ui/inline-action';
import { formatDateTime } from '@/lib/time';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { claimDecisionAction } from '../../actions';

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage('claim.review', `/admin/claims/${id}`);
  const c = await prisma.operatorClaim.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, createdAt: true } }, operator: { include: { authorizations: true, contacts: { select: { emails: true, kind: true } }, memberships: { where: { status: 'ACTIVE' } } } } },
  });
  if (!c) notFound();
  const domain = c.workEmail.split('@')[1] ?? '';
  const knownEmails = c.operator?.contacts.flatMap((x) => x.emails) ?? [];
  const domainMatches = knownEmails.some((e) => e.endsWith(`@${domain}`)) || (c.operator?.website ? c.operator.website.includes(domain) : false);
  const open = ['SUBMITTED', 'NEEDS_INFO'].includes(c.status);
  return (
    <>
      <PageHeader eyebrow="Claim" title={c.operator?.legalName ?? `New profile: ${c.proposedName}`} actions={<Status kind="claim" value={c.status} />} />
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-10">
          <section>
            <SectionTitle>Claimant</SectionTitle>
            <DL items={[
              ['Account', `${c.user.name} · ${c.user.email}`],
              ['Account created', formatDateTime(c.user.createdAt)],
              ['Role', c.claimantRole],
              ['Work e-mail', c.workEmail],
              ['Work phone', c.workPhone],
              ['Certificate stated', c.authorityNumber],
              ['Message', c.message],
            ]} />
          </section>
          {c.operator && (
            <section>
              <SectionTitle>Checks</SectionTitle>
              <ul className="flex flex-col gap-3 text-sm">
                <li>{domainMatches ? '✓' : '✗'} E-mail domain <span className="strip">@{domain}</span> {domainMatches ? 'matches' : 'does not match'} the operator’s known website or contacts.</li>
                <li>Recorded certificate: <span className="strip">{c.operator.authorizations.map((a) => a.numberRaw).join(', ') || '—'}</span>; stated: <span className="strip">{c.authorityNumber ?? '—'}</span></li>
                <li>{c.operator.memberships.length > 0 ? `⚠ Operator already has ${c.operator.memberships.length} active member(s).` : 'No existing members.'}</li>
              </ul>
              <p className="mt-3 text-sm"><Link className="underline" href={`/admin/operators/${c.operator.id}`}>Open operator record →</Link></p>
            </section>
          )}
          {!c.operator && <Notice tone="warning">Approving creates a new operator record ({c.proposedCountry ?? 'IN'}) in CLAIMED state. Search the directory first to avoid duplicates.</Notice>}
        </div>
        <aside className="flex flex-col gap-4">
          <SectionTitle>Decision</SectionTitle>
          {open ? (
            <>
              <InlineAction action={claimDecisionAction} hidden={{ id: c.id, decision: 'APPROVED' }} label="Approve claim" variant="primary" reason={{ label: 'Note to claimant (optional)', name: 'note' }} />
              <InlineAction action={claimDecisionAction} hidden={{ id: c.id, decision: 'NEEDS_INFO' }} label="Ask for more information" reason={{ label: 'What do you need?', required: true, name: 'note' }} />
              <InlineAction action={claimDecisionAction} hidden={{ id: c.id, decision: 'REJECTED' }} label="Reject" variant="danger" reason={{ label: 'Reason', required: true, name: 'note' }} />
            </>
          ) : (
            <p className="text-sm text-muted">Decided {c.decidedAt ? formatDateTime(c.decidedAt) : ''}{c.decisionNote ? `: “${c.decisionNote}”` : ''}</p>
          )}
        </aside>
      </div>
    </>
  );
}
