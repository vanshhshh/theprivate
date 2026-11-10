import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Status } from '@/components/domain/status';
import { DL, Notice, PageHeader, Pill, SectionTitle, Table } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { operatorLifecycle } from '@/domain/lifecycle';
import { formatDate, formatDateTime } from '@/lib/time';
import { can, requirePermissionPage } from '@/server/auth/viewer';
import { audit } from '@/server/audit';
import { prisma } from '@/server/db/client';
import { agreementAction, authorizationAction, checkReviewAction, lifecycleAction, listingToggleAction } from '../../actions';

export default async function AdminOperator({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await requirePermissionPage('operator.read', `/admin/operators/${id}`);
  const op = await prisma.operator.findUnique({
    where: { id },
    include: {
      aliases: true,
      authorizations: true,
      contacts: can(v, 'operator.contacts.read') ? { where: { deletedAt: null } } : false,
      memberships: { include: { user: { select: { name: true, email: true } } } },
      claims: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } },
      verificationChecks: { include: { document: { select: { id: true, fileName: true } } } },
      agreements: { orderBy: { version: 'desc' } },
      aircraft: { where: { deletedAt: null }, select: { id: true, registration: true, modelRaw: true, reviewStatus: true, evidenceLevel: true, attributionUncertain: true }, orderBy: { registration: 'asc' } },
      fleetEvidence: true,
      registryEntries: true,
    },
  });
  if (!op) notFound();
  if (op.contacts && op.contacts.length) {
    // Log access to private contacts, at most once per staff member per operator per 15 minutes.
    const recent = await prisma.auditEvent.findFirst({ where: { action: 'operator.contacts.view', entityId: id, actorUserId: v.user.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } });
    if (!recent) await audit({ actorUserId: v.user.id, action: 'operator.contacts.view', entityType: 'Operator', entityId: id });
  }
  const [audits, ext] = await Promise.all([
    prisma.auditEvent.findMany({ where: { entityType: 'Operator', entityId: id }, orderBy: { createdAt: 'desc' }, take: 20, include: { actor: { select: { name: true } } } }),
    prisma.externalIdentifier.findMany({ where: { entityType: 'Operator', entityId: id } }),
  ]);
  const nextStates = operatorLifecycle.next(op.lifecycle, 'STAFF');
  return (
    <>
      <PageHeader eyebrow={<span className="strip">{op.countryCode} · {ext.map((e) => `${e.namespace}:${e.value}`).join(', ')}</span>} title={op.legalName} lede={op.displayName !== op.legalName ? `Trading as ${op.displayName}` : undefined} actions={<><Status kind="operator" value={op.lifecycle} />{op.isPubliclyListed && <Pill tone="info">Listed</Pill>}</>} />
      {op.dataQualityFlags.length > 0 && <div className="mb-10"><Notice tone="warning" title="Data-quality flags from import">{op.dataQualityFlags.join(' · ')}</Notice></div>}
      <div className="grid gap-14 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-14">
          <section>
            <SectionTitle>Regulatory</SectionTitle>
            <Table head={['Authority', 'Number', 'Valid until', 'Source', 'Checked']}>
              {op.authorizations.map((a) => (
                <tr key={a.id}>
                  <td>{a.authority} {a.certificateType}{a.scope ? <span className="block text-xs text-muted">{a.scope.toLowerCase()}</span> : null}</td>
                  <td className="strip">{a.numberStatus === 'VALID' ? a.numberRaw : <span className="text-danger">Malformed: “{a.numberRaw}”</span>}</td>
                  <td>{a.validUntil ? formatDate(a.validUntil) : a.validUntilRaw ? <span className="text-danger">“{a.validUntilRaw}”</span> : '—'}</td>
                  <td className="text-xs">{a.source}</td>
                  <td>{a.verifiedAt ? <Pill tone="verified">{formatDate(a.verifiedAt)}</Pill> : <Pill tone="unconfirmed">No</Pill>}</td>
                </tr>
              ))}
            </Table>
            {op.registryEntries.length > 0 && <p className="mt-3 text-sm text-muted">GCAA registry: {op.registryEntries.map((r) => `${r.organizationName} (${r.approvalNumberRaw})`).join(', ')}</p>}
            {can(v, 'verification.review') && (
              <ActionForm action={authorizationAction} className="mt-6 grid gap-4 sm:grid-cols-4 sm:items-end">
                <input type="hidden" name="id" value={op.id} />
                <Field name="authority" label="Authority"><Select name="authority" defaultValue={op.countryCode === 'AE' ? 'GCAA' : 'DGCA'}><option>DGCA</option><option>GCAA</option></Select></Field>
                <Field name="number" label="Confirmed number"><Input name="number" required className="strip" /></Field>
                <Field name="validUntil" label="Valid until"><Input name="validUntil" type="date" /></Field>
                <SubmitButton variant="secondary">Record</SubmitButton>
              </ActionForm>
            )}
          </section>

          <section>
            <SectionTitle>Verification documents</SectionTitle>
            {op.verificationChecks.length === 0 ? <p className="text-sm text-muted">Nothing uploaded.</p> : (
              <ul className="divide-y divide-line">
                {op.verificationChecks.map((c) => (
                  <li key={c.id} className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>{c.type.toLowerCase().replace(/_/g, ' ')}{c.document && <> · <a href={`/api/files/${c.document.id}`} className="underline">{c.document.fileName}</a></>}{c.expiresAt && <span className="text-xs text-muted"> · expires {formatDate(c.expiresAt)}</span>}</span>
                      <Status kind="check" value={c.status} />
                    </div>
                    {c.status === 'SUBMITTED' && can(v, 'verification.review') && (
                      <div className="flex flex-wrap gap-3">
                        <InlineAction action={checkReviewAction} hidden={{ id: op.id, checkId: c.id, decision: 'ACCEPTED' }} label="Accept" variant="primary" />
                        <InlineAction action={checkReviewAction} hidden={{ id: op.id, checkId: c.id, decision: 'REJECTED' }} label="Reject" variant="danger" reason={{ label: 'What is wrong?', required: true, name: 'note' }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle>Aircraft ({op.aircraft.length}) & fleet evidence ({op.fleetEvidence.length})</SectionTitle>
            <Table head={['Registration', 'Model (source)', 'Evidence', 'Review']}>
              {op.aircraft.map((a) => (
                <tr key={a.id}>
                  <td><Link className="strip underline" href={`/admin/aircraft/${a.id}`}>{a.registration}</Link>{a.attributionUncertain && <span className="block text-xs text-danger">attribution uncertain</span>}</td>
                  <td className="text-sm">{a.modelRaw}</td>
                  <td><Status kind="evidence" value={a.evidenceLevel} /></td>
                  <td><Status kind="aircraftReview" value={a.reviewStatus} /></td>
                </tr>
              ))}
            </Table>
            {op.fleetEvidence.length > 0 && (
              <ul className="mt-4 text-sm text-ink-2">
                {op.fleetEvidence.map((f) => <li key={f.id} className="border-b border-line py-1.5">{f.modelRaw}{f.reportedCount ? ` × ${f.reportedCount}` : ''} · <span className="text-muted">{f.evidenceLevel.toLowerCase().replace(/_/g, ' ')}{f.usageRaw ? ` · ${f.usageRaw}` : ''}</span></li>)}
              </ul>
            )}
          </section>

          {op.contacts && (
            <section>
              <SectionTitle aside="Private · access audited by role">Contacts (CRM)</SectionTitle>
              <Table head={['Kind', 'Name', 'E-mail', 'Phone', 'Confidence']}>
                {op.contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="text-xs">{c.kind.toLowerCase().replace('_', ' ')}</td>
                    <td>{c.name ?? '—'}{c.title && <span className="block text-xs text-muted">{c.title}</span>}{c.note && <span className="block text-xs text-muted">{c.note}</span>}</td>
                    <td className="text-sm">{c.emails.join(', ') || '—'}</td>
                    <td className="strip text-sm">{c.phones.join(', ') || c.unparsedPhones.join(', ') || '—'}</td>
                    <td className="text-xs">{c.confidence.toLowerCase()}</td>
                  </tr>
                ))}
              </Table>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-12">
          {can(v, 'operator.lifecycle') && nextStates.length > 0 && (
            <section>
              <SectionTitle>Lifecycle</SectionTitle>
              <div className="flex flex-col gap-3">
                {nextStates.map((to) => (
                  <InlineAction key={to} action={lifecycleAction} hidden={{ id: op.id, to }} label={`Move to ${to.toLowerCase().replace(/_/g, ' ')}`} variant={['SUSPENDED', 'REJECTED', 'EXCLUDED'].includes(to) ? 'danger' : 'secondary'} reason={{ label: 'Note (required for suspend/reject/exclude)', name: 'note' }} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">Preconditions are enforced: verification needs accepted documents and a valid certificate; activation needs a signed agreement.</p>
            </section>
          )}
          {can(v, 'operator.lifecycle') && ['VERIFIED', 'AGREEMENT_SIGNED', 'ACTIVE'].includes(op.lifecycle) && (
            <section>
              <SectionTitle>Public directory</SectionTitle>
              <InlineAction action={listingToggleAction} hidden={{ id: op.id, listed: op.isPubliclyListed ? 'false' : 'true' }} label={op.isPubliclyListed ? 'Remove from directory' : 'List in directory'} />
            </section>
          )}
          <section>
            <SectionTitle>Agreements</SectionTitle>
            {op.agreements.length === 0 ? <p className="text-sm text-muted">None.</p> : (
              <ul className="mb-5 text-sm">{op.agreements.map((a) => <li key={a.id} className="flex justify-between border-b border-line py-2"><span>v{a.version} · {(a.commissionBps / 100).toFixed(2)} % · {a.currency}</span><span>{a.status.toLowerCase()}{a.signedAt ? ` ${formatDate(a.signedAt)}` : ''}</span></li>)}</ul>
            )}
            {can(v, 'agreement.manage') && op.lifecycle === 'VERIFIED' && (
              <ActionForm action={agreementAction} className="grid grid-cols-2 gap-4">
                <input type="hidden" name="id" value={op.id} />
                <Field name="commissionBps" label="Fee (bps)" hint="800 = 8 %"><Input name="commissionBps" type="number" min={0} max={5000} required className="strip" /></Field>
                <Field name="currency" label="Currency"><Select name="currency" defaultValue={op.countryCode === 'AE' ? 'AED' : 'INR'}>{['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
                <Field name="minimumFee" label="Minimum fee (optional)" className="col-span-2"><Input name="minimumFee" className="strip" /></Field>
                <SubmitButton variant="secondary" className="col-span-2 justify-self-start">Issue agreement</SubmitButton>
              </ActionForm>
            )}
          </section>
          <section>
            <SectionTitle>Members & claims</SectionTitle>
            <ul className="text-sm">
              {op.memberships.map((m) => <li key={m.id} className="border-b border-line py-2">{m.user.name} · {m.role.toLowerCase()} · {m.status.toLowerCase()}</li>)}
              {op.claims.map((c) => <li key={c.id} className="border-b border-line py-2"><Link className="underline" href={`/admin/claims/${c.id}`}>Claim by {c.user.name}</Link> · {c.status.toLowerCase()}</li>)}
              {op.memberships.length + op.claims.length === 0 && <li className="text-muted">Unclaimed.</li>}
            </ul>
          </section>
          <section>
            <SectionTitle>Aliases</SectionTitle>
            <p className="text-sm text-ink-2">{op.aliases.map((a) => a.alias).join(' · ') || '—'}</p>
          </section>
          <section>
            <SectionTitle>Research (internal)</SectionTitle>
            <DL items={[['Relevance', op.researchRelevance], ['Activity', op.researchCharterActivity], ['Kind', op.researchOperatorKind], ['Website', op.website]]} />
          </section>
          <section>
            <SectionTitle>Recent audit</SectionTitle>
            <ul className="text-xs">
              {audits.map((a) => <li key={a.id} className="border-b border-line py-1.5"><span className="strip">{formatDateTime(a.createdAt)}</span> · {a.action} · {a.actor?.name ?? a.actorType.toLowerCase()}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
