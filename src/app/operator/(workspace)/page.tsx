import Link from 'next/link';
import { LinkButton } from '@/components/ui/button';
import { Notice, PageHeader, SectionTitle, Stat } from '@/components/ui/display';
import { cn } from '@/lib/cn';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Operator overview' };

const STEPS = [
  ['CLAIMED', 'Claimed', 'Your claim was approved.'],
  ['IN_REVIEW', 'Verification', 'Upload certificate, registration and insurance, then submit.'],
  ['VERIFIED', 'Verified', 'ThePrivate checked your documents and certificate.'],
  ['AGREEMENT_SIGNED', 'Agreement', 'Review and sign the commercial agreement.'],
  ['ACTIVE', 'Active', 'Receive requests, quote and publish empty legs.'],
] as const;

const NEXT: Record<string, { text: string; href: string; cta: string } | null> = {
  CLAIMED: { text: 'Upload your verification documents and submit them for review.', href: '/operator/verification', cta: 'Start verification' },
  IN_REVIEW: null,
  VERIFIED: { text: 'Your agreement will appear here once issued by our supply team.', href: '/operator/agreement', cta: 'View agreement' },
  AGREEMENT_SIGNED: null,
  ACTIVE: { text: 'Keep your fleet and availability current so you match more requests.', href: '/operator/fleet', cta: 'Manage fleet' },
  SUSPENDED: null,
};

export default async function OperatorHome() {
  const { operatorId, membership } = await requireOperatorPage('/operator');
  const lifecycle = membership.operator.lifecycle;
  const [fleet, approved, openRequests, openQuotes, pendingBookings, liveLegs, agreement] = await Promise.all([
    prisma.aircraft.count({ where: { operatorId, deletedAt: null } }),
    prisma.aircraft.count({ where: { operatorId, reviewStatus: 'APPROVED', charterEligible: true } }),
    prisma.rfqRecipient.count({ where: { operatorId, status: { in: ['SENT', 'VIEWED'] }, rfq: { status: { in: ['AWAITING_QUOTES', 'QUOTES_AVAILABLE'] } } } }),
    prisma.quote.count({ where: { operatorId, status: { in: ['SUBMITTED', 'REVISED'] } } }),
    prisma.booking.count({ where: { operatorId, status: 'PENDING_OPERATOR_CONFIRMATION' } }),
    prisma.emptyLegListing.count({ where: { operatorId, status: 'PUBLISHED', validUntil: { gt: new Date() } } }),
    prisma.agreement.findFirst({ where: { operatorId, status: 'SENT' } }),
  ]);
  const currentIdx = STEPS.findIndex((s) => s[0] === lifecycle);
  const next = lifecycle === 'VERIFIED' && agreement ? { text: 'Your agreement is ready to sign.', href: '/operator/agreement', cta: 'Review & sign' } : NEXT[lifecycle];
  return (
    <>
      <PageHeader eyebrow="Overview" title={membership.operator.displayName} />
      {lifecycle !== 'ACTIVE' && (
        <section className="mb-12">
          <SectionTitle>Path to going live</SectionTitle>
          <ol className="grid gap-px bg-line md:grid-cols-5">
            {STEPS.map(([key, label, desc], i) => {
              const done = currentIdx > i;
              const current = currentIdx === i;
              return (
                <li key={key} className={cn('bg-paper p-4', current && 'bg-paper-2')}>
                  <span className={cn('strip inline-flex size-6 items-center justify-center border text-xs', done ? 'border-verified bg-verified text-paper' : current ? 'border-magenta text-magenta' : 'border-line-strong text-muted')}>{done ? '✓' : i + 1}</span>
                  <p className="mt-3 font-medium">{label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{desc}</p>
                </li>
              );
            })}
          </ol>
          {next && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-l-2 border-magenta bg-paper-2 px-5 py-4">
              <p>{next.text}</p>
              <LinkButton href={next.href} size="sm">{next.cta}</LinkButton>
            </div>
          )}
          {lifecycle === 'IN_REVIEW' && <div className="mt-6"><Notice>Your documents are with our supply team. We will notify you when verification completes.</Notice></div>}
          {lifecycle === 'AGREEMENT_SIGNED' && <div className="mt-6"><Notice>Agreement signed. Our team will activate your account; you will then start receiving matching requests.</Notice></div>}
          {lifecycle === 'SUSPENDED' && <div className="mt-6"><Notice tone="danger">Your account is suspended. Contact ThePrivate supply team.</Notice></div>}
        </section>
      )}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Requests to answer" value={openRequests} href="/operator/requests" />
        <Stat label="Open quotes" value={openQuotes} href="/operator/requests" />
        <Stat label="Bookings to confirm" value={pendingBookings} href="/operator/bookings" />
        <Stat label="Aircraft" value={fleet} href="/operator/fleet" />
        <Stat label="Quotable aircraft" value={approved} href="/operator/fleet" hint="Approved & enabled" />
        <Stat label="Live empty legs" value={liveLegs} href="/operator/empty-legs" />
      </div>
      {fleet > 0 && approved === 0 && (
        <p className="mt-10 text-sm text-ink-2">
          None of your aircraft is approved for charter yet. Imported aircraft come from public registers and must be confirmed by you. <Link className="underline" href="/operator/fleet">Review your fleet →</Link>
        </p>
      )}
    </>
  );
}
