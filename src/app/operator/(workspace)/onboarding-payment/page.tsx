import Link from 'next/link';
import { scene, SceneImage } from '@/components/cinematic/scene';
import { formatMinor } from '@/domain/payments/onboarding';
import { Notice, Pill, SectionTitle } from '@/components/ui/display';
import { buttonClass } from '@/components/ui/button';
import { ActionForm } from '@/components/ui/form';
import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { onboardingPaymentState } from '@/server/payments/onboarding/service';
import { cancelCheckoutAction } from './actions';

export const metadata = { title: 'Onboarding fee' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = {
  PAYMENT_PENDING: 'Awaiting payment', PAYMENT_PROCESSING: 'Processing', PAID: 'Paid', PAYMENT_FAILED: 'Failed', PAYMENT_CANCELLED: 'Cancelled', REFUND_PENDING: 'Refund in progress', REFUNDED: 'Refunded', PAYMENT_REVERSED: 'Reversed',
};

const CHECKOUT_MESSAGES: Record<string, string> = {
  unavailable: 'Payment could not be started right now. Nothing was charged. Please try again shortly.',
  paid: 'The onboarding fee has already been paid.',
  forbidden: 'Only an owner or manager can complete the payment.',
  error: 'Something went wrong on our side. Nothing was charged. Please try again.',
};

export default async function OnboardingPayment({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const checkoutMessage = checkout ? CHECKOUT_MESSAGES[checkout] : undefined;
  const { membership, operatorId } = await requireOperatorPage('/operator/onboarding-payment');
  const s = await onboardingPaymentState(operatorId);
  const canPay = hasRole(membership.role, 'MANAGER');
  const q = s.quote;

  return (
    <>
      <section className="relative isolate mb-12 overflow-hidden rounded-sm bg-night text-paper">
        <SceneImage plate={scene('cabin-warm')} sizes="70vw" drift={false} settle={false} />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/85 to-night/40" />
        <div className="relative p-8 md:p-12">
          <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">Onboarding · final step</p>
          <h1 className="font-display max-w-2xl text-[40px] leading-[1.02] md:text-[56px]">{s.operator.displayName}</h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-paper/80">The one-time onboarding fee completes your submission. Our team then carries out the final review.</p>
        </div>
      </section>

      {!s.required ? (
        <Notice tone="info" title="No onboarding fee applies">There is nothing to pay. Your onboarding continues with our team&apos;s review.</Notice>
      ) : s.paid ? (
        <Notice tone="success" title="Your onboarding payment is complete">
          {formatMinor(s.paid.totalMinor, s.paid.currency)} paid{s.paid.paidAt ? ` on ${s.paid.paidAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Your company profile is submitted for review. <Link className="underline" href={`/operator/onboarding-payment/receipt/${s.paid.id}`}>View receipt</Link>
        </Notice>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section>
            <SectionTitle>What you are paying</SectionTitle>
            {q ? (
              <dl className="divide-y divide-line border-y border-ink text-[16px]">
                <div className="flex justify-between py-4"><dt>Onboarding fee</dt><dd className="strip">{formatMinor(q.feeMinor, q.currency)}</dd></div>
                <div className="flex justify-between py-4"><dt>{q.taxLabel ?? 'Tax'}{q.taxRateBps ? ` (${q.taxRateBps / 100}%)` : ''}</dt><dd className="strip">{q.taxMinor ? formatMinor(q.taxMinor, q.currency) : 'None'}</dd></div>
                <div className="flex justify-between py-5 text-[20px]"><dt className="font-display">Total</dt><dd className="strip">{formatMinor(q.totalMinor, q.currency)}</dd></div>
              </dl>
            ) : (
              <p className="text-muted">The fee has not been configured yet.</p>
            )}
            {q?.coverage && (<><h3 className="font-display mt-10 text-[24px]">What the fee covers</h3><p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{q.coverage}</p></>)}
            <h3 className="font-display mt-10 text-[24px]">Refunds</h3>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{q?.refundPolicy ?? 'Not yet published.'}</p>
            <p className="mt-8 rounded-sm bg-paper-2 px-5 py-4 text-[14px] leading-relaxed text-ink-2">Paying the onboarding fee does not verify your company or its aircraft, does not activate your profile, and does not guarantee flight requests or acceptance by ThePrivate. Activation follows our team&apos;s final review.</p>
          </section>

          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="rounded-sm bg-night p-7 text-paper">
              <p className="strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk">Secure payment</p>
              {s.blockers.length ? (
                <div className="text-ink"><Notice tone="warning" title="Payment is not available yet">{s.blockers.join(' ')}</Notice></div>
              ) : !s.readyForPayment ? (
                <p className="text-[15px] leading-relaxed text-paper/80">The onboarding fee becomes payable after your agreement is signed. Current status: {s.operator.lifecycle.replace(/_/g, ' ').toLowerCase()}.</p>
              ) : !canPay ? (
                <p className="text-[15px] text-paper/80">An owner or manager of {s.operator.displayName} can complete the payment.</p>
              ) : (
                <>
                  <p className="font-display text-[34px] leading-none">{q && formatMinor(q.totalMinor, q.currency)}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-paper/70">{s.provider === 'razorpay' ? 'You will pay in Razorpay’s secure payment window' : 'You will complete payment on our payment provider’s secure page'}{s.testMode ? ' (test mode: no real money moves)' : ''}. ThePrivate never sees or stores your card details.</p>
                  {checkoutMessage && <div className="mt-5 text-ink"><Notice tone="warning">{checkoutMessage}</Notice></div>}
                  {/* A plain POST (303 → checkout page) so the checkout loads as a full document with its own CSP. */}
                  <form method="post" action="/operator/onboarding-payment/start" className="mt-6">
                    <button type="submit" className={buttonClass('primary', 'md', 'h-13 w-full')}>{s.open ? 'Continue to payment' : 'Pay securely'}</button>
                  </form>
                  {s.open && (
                    <ActionForm action={cancelCheckoutAction} className="mt-3">
                      <input type="hidden" name="paymentId" value={s.open.id} />
                      <button className="text-[13px] text-paper/60 underline underline-offset-4 hover:text-paper">Cancel this checkout</button>
                    </ActionForm>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {s.history.length > 0 && (
        <section className="mt-14">
          <SectionTitle>Payment history</SectionTitle>
          <ul className="divide-y divide-line text-[14px]">
            {s.history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="strip">{formatMinor(p.totalMinor, p.currency)} · {p.createdAt.toISOString().slice(0, 10)}{p.receiptNumber ? ` · ${p.receiptNumber}` : ''}</span>
                <span className="flex items-center gap-3"><Pill tone={p.status === 'PAID' ? 'verified' : p.status === 'PAYMENT_FAILED' ? 'danger' : 'neutral'}>{STATUS[p.status]}</Pill>{p.receiptNumber && <Link className="text-sectional underline" href={`/operator/onboarding-payment/receipt/${p.id}`}>Receipt</Link>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
