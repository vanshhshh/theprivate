import Link from 'next/link';
import { formatMinor } from '@/domain/payments/onboarding';
import { LinkButton } from '@/components/ui/button';
import { Notice } from '@/components/ui/display';
import { requireOperatorPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Onboarding payment' };
export const dynamic = 'force-dynamic';

/**
 * The return page after checkout. It shows only what the SERVER has confirmed (via a verified
 * webhook): arriving here, or any query parameter, proves nothing about payment.
 */
export default async function Complete({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { payment } = await searchParams;
  const { operatorId } = await requireOperatorPage('/operator/onboarding-payment');
  const p = payment ? await prisma.onboardingPayment.findFirst({ where: { id: payment, operatorId }, include: { operator: { select: { displayName: true, lifecycle: true } } } }) : null;
  if (!p) return <Notice tone="warning" title="Payment not found">Return to the <Link className="underline" href="/operator/onboarding-payment">onboarding fee</Link> page.</Notice>;

  if (p.status !== 'PAID') {
    const pending = p.status === 'PAYMENT_PENDING' || p.status === 'PAYMENT_PROCESSING';
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-[40px] leading-tight">{pending ? 'Waiting for confirmation' : 'Payment not completed'}</h1>
        <p className="mt-4 text-[16px] text-ink-2">
          {pending ? 'We have not received confirmation from the payment provider yet. This page shows a payment as complete only after the provider confirms it to us directly. Refresh in a moment.' : 'Nothing was charged. You can try again whenever you are ready.'}
        </p>
        <div className="mt-8"><LinkButton href="/operator/onboarding-payment" variant="secondary">Back to the onboarding fee</LinkButton></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-magenta">Onboarding</p>
      <h1 className="font-display text-[44px] leading-[1.02] md:text-[56px]">Your onboarding payment is <em>complete.</em></h1>
      <p className="mt-5 text-[17px] leading-relaxed text-ink-2">Your company profile has been submitted for review. We will notify you when the review is complete.</p>
      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line sm:grid-cols-3">
        {[
          ['Company', p.operator.displayName],
          ['Amount paid', formatMinor(p.totalMinor, p.currency)],
          ['Currency', p.currency],
          ['Transaction reference', p.providerPaymentId ?? '—'],
          ['Receipt number', p.receiptNumber ?? '—'],
          ['Payment date', p.paidAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—'],
        ].map(([k, v]) => (
          <div key={k} className="bg-paper p-5"><dt className="text-[13px] text-muted">{k}</dt><dd className="mt-1.5 break-words">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-8"><Notice tone="info" title="Current status: submitted for final review">Your company is not yet verified or active. Next: our team completes the final review and lets you know the outcome.</Notice></div>
      <div className="mt-8 flex flex-wrap gap-4">
        <LinkButton href={`/operator/onboarding-payment/receipt/${p.id}`} arrow>View and download receipt</LinkButton>
        <LinkButton href="/operator" variant="secondary">Back to your workspace</LinkButton>
      </div>
    </div>
  );
}
