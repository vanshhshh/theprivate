import Link from 'next/link';
import { composeInvitation } from '@/domain/invitations/compose';
import { Notice, PageHeader, Pill, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { requirePermissionPage } from '@/server/auth/viewer';
import { campaignSummary, listCandidates, liveSendBlockers } from '@/server/invitations/service';
import { approveCampaignAction, resendAction, revokeAction } from '../../actions';

export const metadata = { title: 'Invitation campaign' };
export const dynamic = 'force-dynamic';

export default async function Campaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requirePermissionPage('invite.manage', `/admin/invitations/campaigns/${id}`);
  const { camp, byStatus, byCountry, readyCount } = await campaignSummary(id);
  const blockers = liveSendBlockers();
  const canSend = viewer.permissions.has('invite.send');
  // Three personalised samples, rendered exactly as they will be sent (link is a placeholder).
  const candidates = new Map((await listCandidates()).map((c) => [c.operatorId, c]));
  const samples = camp.invitations.filter((i) => i.status === 'READY').slice(0, 3).flatMap((i) => {
    const f = candidates.get(i.operatorId)?.facts;
    if (!f) return [];
    return [composeInvitation({ ...f, recipientEmail: i.email, recipientName: i.recipientName }, { claimUrl: 'https://theprivate.in/claim/<unique-link>', unsubscribeUrl: 'https://theprivate.in/unsubscribe?…', appUrl: 'https://theprivate.in' }, { name: 'ThePrivate', postalAddress: process.env.SENDER_POSTAL_ADDRESS ?? '[sender postal address]', replyTo: null })];
  });

  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/invitations" className="hover:underline">Company invitations</Link>} title={camp.name} lede={`Created ${camp.createdAt.toISOString().slice(0, 10)} · ${camp.status}${camp.approvedAt ? ` · approved ${camp.approvedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC for ${camp.approvedCount} recipients` : ''}`} actions={<a className="text-sectional underline underline-offset-4" href={`/admin/invitations/export?campaign=${camp.id}`}>Export CSV</a>} />

      <div className="mb-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-sm bg-paper-2 p-5"><p className="text-[13px] text-muted">Recipients awaiting approval</p><p className="strip mt-1 text-3xl">{readyCount}</p><p className="mt-1 text-[13px] text-muted">{Object.entries(byCountry).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p></div>
        <div className="rounded-sm bg-paper-2 p-5 text-[13px] md:col-span-2"><p className="text-muted">By status</p><p className="mt-2 flex flex-wrap gap-2">{Object.entries(byStatus).map(([k, v]) => <Pill key={k} tone="neutral">{k.replace(/_/g, ' ')} {v}</Pill>)}</p></div>
      </div>

      {camp.status === 'DRAFT' && (
        <section className="mb-12">
          <SectionTitle>Approve and send</SectionTitle>
          {blockers.length ? (
            <Notice tone="warning" title="Live sending is blocked">
              <ul className="list-inside list-disc">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </Notice>
          ) : !canSend ? (
            <Notice tone="info">Approval needs the invite.send permission (super administrator).</Notice>
          ) : (
            <ActionForm action={approveCampaignAction} className="grid max-w-xl gap-5">
              <input type="hidden" name="campaignId" value={camp.id} />
              <input type="hidden" name="confirmCount" value={readyCount} />
              <p className="text-[15px]">This will e-mail <strong>{readyCount}</strong> companies, one every few seconds. Each recipient is re-checked at approval time.</p>
              <Field name="confirm" label='Type SEND to confirm'><Input name="confirm" autoComplete="off" required /></Field>
              <SubmitButton variant="danger" pendingLabel="Queuing…">Approve and send to {readyCount} companies</SubmitButton>
            </ActionForm>
          )}
        </section>
      )}

      {samples.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Sample messages</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-3">
            {samples.map((m, i) => (
              <details key={i} className="rounded-sm bg-paper-2 p-4" open={i === 0}>
                <summary className="cursor-pointer font-medium">{m.subject}</summary>
                <pre className="mt-3 max-h-[460px] overflow-auto whitespace-pre-wrap text-[12px] leading-relaxed">{m.text}</pre>
              </details>
            ))}
          </div>
        </section>
      )}

      <SectionTitle>Invitations</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-[14px]">
          <thead><tr className="border-b border-ink text-[11px] uppercase tracking-[0.12em] text-muted"><th className="py-2.5 pr-3">Company</th><th className="pr-3">Recipient</th><th className="pr-3">Status</th><th className="pr-3">Sent</th><th className="pr-3">Detail</th><th /></tr></thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-line [&_td]:py-3 [&_td]:pr-3 [&_td]:align-top">
            {camp.invitations.map((i) => (
              <tr key={i.id}>
                <td>{i.operator.displayName}<span className="block text-[12px] text-muted">{i.operator.countryCode}</span></td>
                <td className="strip text-[13px]">{i.email}</td>
                <td><Pill tone={i.status === 'CLAIMED' ? 'verified' : ['BOUNCED', 'FAILED'].includes(i.status) ? 'danger' : 'neutral'}>{i.status.replace(/_/g, ' ')}</Pill></td>
                <td className="text-[13px]">{i.sentAt ? i.sentAt.toISOString().slice(0, 16).replace('T', ' ') : '—'}{i.expiresAt && <span className="block text-muted">expires {i.expiresAt.toISOString().slice(0, 10)}</span>}</td>
                <td className="max-w-64 text-[13px] text-muted">{i.lastError ?? (i.firstVisitedAt ? `link visited ${i.firstVisitedAt.toISOString().slice(0, 10)}` : '')}</td>
                <td className="flex flex-col gap-2">
                  {!['CLAIMED', 'REVOKED'].includes(i.status) && <InlineAction action={revokeAction} hidden={{ invitationId: i.id }} label="Revoke" variant="ghost" confirm="Revoke? The link stops working immediately." />}
                  {canSend && ['SENT', 'EXPIRED', 'FAILED'].includes(i.status) && <InlineAction action={resendAction} hidden={{ invitationId: i.id }} label="Resend" confirm="Send again with a new link? The old link stops working." />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
