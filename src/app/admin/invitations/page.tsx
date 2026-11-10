import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Notice, PageHeader, Pill, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { mailerStatus } from '@/server/email/mailer';
import { inviteConfig, listCandidates, liveSendBlockers } from '@/server/invitations/service';
import { createCampaignAction, testSmtpAction } from './actions';

export const metadata = { title: 'Company invitations' };
export const dynamic = 'force-dynamic';

const SOURCE: Record<string, string> = { CHARTER_SALES: 'Charter sales (public)', COMPANY: 'Company address', DECISION_MAKER: 'Named contact (public)', REGULATOR: 'Regulator register' };

export default async function Invitations({ searchParams }: { searchParams: Promise<{ q?: string; country?: string; show?: string }> }) {
  const viewer = await requirePermissionPage('invite.manage', '/admin/invitations');
  const sp = await searchParams;
  const [all, campaigns, suppressedCount] = await Promise.all([listCandidates(), prisma.invitationCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { _count: { select: { invitations: true } } } }), prisma.emailSuppression.count()]);
  const m = mailerStatus();
  const cfg = inviteConfig();
  const blockers = liveSendBlockers();

  const eligible = all.filter((c) => c.eligibility.eligible);
  const byCountry = eligible.reduce<Record<string, number>>((a, c) => ((a[c.countryCode] = (a[c.countryCode] ?? 0) + 1), a), {});
  const byCategory = all.reduce<Record<string, number>>((a, c) => ((a[c.categoryLabel] = (a[c.categoryLabel] ?? 0) + 1), a), {});
  const show = sp.show ?? 'eligible';
  const rows = all.filter((c) => (show === 'all' ? true : show === 'ineligible' ? !c.eligibility.eligible : c.eligibility.eligible) && (!sp.country || c.countryCode === sp.country) && (!sp.q || c.name.toLowerCase().includes(sp.q.toLowerCase())));

  return (
    <>
      <PageHeader eyebrow="Supply" title="Company invitations" lede="Personal, company-specific invitations to claim a profile. Nothing is sent to a company until a campaign is approved by someone with send permission and live sending is enabled." />

      <div className="mb-12 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>E-mail sending</SectionTitle>
          <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-[14px]">
            <dt className="text-muted">SMTP</dt><dd>{m.configured ? <Pill tone="verified">Configured</Pill> : <Pill tone="danger">Missing {m.missing.join(', ')}</Pill>} <span className="ml-2 text-muted">{m.mode}</span></dd>
            <dt className="text-muted">Server</dt><dd className="strip">{m.host ? `${m.host}:${m.port}${m.secure ? ' (TLS)' : ''}` : '—'}</dd>
            <dt className="text-muted">From</dt><dd>{m.from ?? '—'}</dd>
            <dt className="text-muted">Reply-to</dt><dd>{m.replyTo ?? 'same as From'}</dd>
            <dt className="text-muted">Link expiry</dt><dd>{cfg.expiryDays > 0 ? `${cfg.expiryDays} days` : 'Never (revoke to withdraw)'}</dd>
            <dt className="text-muted">Pace</dt><dd>one every {cfg.intervalSeconds}s, at most {cfg.dailyCap} per 24 h</dd>
          </dl>
          {m.configured && (
            <ActionForm action={testSmtpAction} className="mt-4">
              <SubmitButton variant="secondary" pendingLabel="Checking…">Check SMTP connection (sends nothing)</SubmitButton>
            </ActionForm>
          )}
        </div>
        <div>
          <SectionTitle>Live sending</SectionTitle>
          {blockers.length ? (
            <Notice tone="warning" title="Live sending is blocked (safe default)">
              <ul className="list-inside list-disc">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </Notice>
          ) : (
            <Notice tone="success" title="Live sending is possible">Campaigns still need explicit approval with the exact recipient count.</Notice>
          )}
          <p className="mt-4 text-[14px] text-muted">{suppressedCount} suppressed address{suppressedCount === 1 ? '' : 'es'} (unsubscribed, bounced or manual).</p>
        </div>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-sm bg-paper-2 p-5"><p className="text-[13px] text-muted">Eligible now</p><p className="strip mt-1 text-3xl">{eligible.length}</p><p className="mt-1 text-[13px] text-muted">{Object.entries(byCountry).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p></div>
        <div className="rounded-sm bg-paper-2 p-5"><p className="text-[13px] text-muted">Not eligible</p><p className="strip mt-1 text-3xl">{all.length - eligible.length}</p><p className="mt-1 text-[13px] text-muted">of {all.length} companies on record</p></div>
        <div className="rounded-sm bg-paper-2 p-5 text-[13px]"><p className="text-muted">By category</p><ul className="mt-2 space-y-0.5">{Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="strip">{v}</span></li>)}</ul></div>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-4 text-[14px]" action="/admin/invitations">
        <label className="flex flex-col gap-1"><span className="text-[13px] text-muted">Search</span><input name="q" defaultValue={sp.q ?? ''} className="border-b border-line-strong bg-transparent py-2" /></label>
        <label className="flex flex-col gap-1"><span className="text-[13px] text-muted">Country</span><select name="country" defaultValue={sp.country ?? ''} className="border-b border-line-strong bg-transparent py-2"><option value="">All</option><option value="IN">India</option><option value="AE">UAE</option></select></label>
        <label className="flex flex-col gap-1"><span className="text-[13px] text-muted">Show</span><select name="show" defaultValue={show} className="border-b border-line-strong bg-transparent py-2"><option value="eligible">Eligible</option><option value="ineligible">Not eligible</option><option value="all">All</option></select></label>
        <button className={buttonClass('secondary', 'sm')}>Filter</button>
        <span className="ml-auto text-muted">{rows.length} shown</span>
      </form>

      <ActionForm action={createCampaignAction}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[14px]">
            <thead><tr className="border-b border-ink text-[11px] uppercase tracking-[0.12em] text-muted"><th className="py-2.5 pr-3">Select</th><th className="pr-3">Company</th><th className="pr-3">Category</th><th className="pr-3">Recipient</th><th className="pr-3">Eligibility</th><th className="pr-3">Last invitation</th><th /></tr></thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-line [&_td]:py-3 [&_td]:pr-3 [&_td]:align-top">
              {rows.map((c) => {
                const r = c.eligibility.recipient;
                return (
                  <tr key={c.operatorId}>
                    <td>{c.eligibility.eligible && <input type="checkbox" name="operatorId" value={c.operatorId} aria-label={`Select ${c.name}`} className="size-4 accent-magenta" />}</td>
                    <td><span className="font-medium">{c.name}</span><span className="block text-[12px] text-muted">{c.countryCode}{c.website ? ` · ${c.website.replace(/^https?:\/\//, '')}` : ''}</span></td>
                    <td className="text-[13px]">{c.categoryLabel}</td>
                    <td>{r ? (<><span className="strip text-[13px]">{r.email}</span><span className="block text-[12px] text-muted">{SOURCE[r.source]}{r.name ? ` · ${r.name}` : ''}{r.genericDomain ? ' · free-mail (claim reviewed)' : r.domainMatchesWebsite ? ' · company domain' : ''}</span></>) : <span className="text-muted">—</span>}</td>
                    <td className="max-w-72 text-[13px]">{c.eligibility.eligible ? <Pill tone="verified">Ready</Pill> : <span className="text-muted">{c.eligibility.reasons.join('; ')}</span>}</td>
                    <td className="text-[13px]">{c.latestInvitation ? <><Pill tone="neutral">{c.latestInvitation.status.replace(/_/g, ' ')}</Pill>{c.latestInvitation.sentAt && <span className="block text-muted">{c.latestInvitation.sentAt.toISOString().slice(0, 10)}</span>}</> : <span className="text-muted">None</span>}</td>
                    <td>{r && <Link prefetch={false} href={`/admin/invitations/preview/${c.operatorId}`} className="text-sectional underline underline-offset-4">Preview</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap items-end gap-6 border-t border-line pt-6">
          <Field name="name" label="New campaign name" className="min-w-72"><Input name="name" required defaultValue={`Company invitations ${new Date().toISOString().slice(0, 10)}`} /></Field>
          <SubmitButton pendingLabel="Preparing…">Prepare campaign from selected</SubmitButton>
          <p className="max-w-md text-[13px] text-muted">Preparing creates a draft only. Nothing is sent until the campaign is reviewed and approved.</p>
        </div>
      </ActionForm>

      <section className="mt-14">
        <SectionTitle>Campaigns</SectionTitle>
        {campaigns.length === 0 ? <p className="text-muted">No campaigns yet.</p> : (
          <ul className="divide-y divide-line">
            {campaigns.map((cp) => (
              <li key={cp.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Link prefetch={false} href={`/admin/invitations/campaigns/${cp.id}`} className="font-medium underline underline-offset-4">{cp.name}</Link>
                <span className="text-[13px] text-muted">{cp._count.invitations} invitations · <Pill tone="neutral">{cp.status}</Pill> · {cp.createdAt.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-10 text-[12px] text-muted">Signed in as {viewer.user.email}. Test e-mails can only go to this address{cfg.testAllowlist.length ? ' or the configured test allowlist' : ''}.</p>
    </>
  );
}
