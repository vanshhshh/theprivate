import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { scene, SceneImage } from '@/components/cinematic/scene';
import { Notice } from '@/components/ui/display';
import { formatMinor } from '@/domain/payments/onboarding';
import { hasRole, requireOperatorPage } from '@/server/auth/viewer';
import { checkoutSession } from '@/server/payments/onboarding/service';
import { RazorpayCheckout } from './razorpay-checkout';

export const metadata = { title: 'Secure payment' };
export const dynamic = 'force-dynamic';

/**
 * Razorpay Standard Checkout for one of the company's own unpaid orders. The amount shown and
 * charged comes from the order snapshot on the server; card details stay inside Razorpay's iframe.
 */
export default async function Checkout({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const ctx = await requireOperatorPage('/operator/onboarding-payment');
  if (!hasRole(ctx.membership.role, 'MANAGER')) notFound();
  const s = await checkoutSession(ctx, decodeURIComponent(orderId));
  if (!s) notFound();
  const p = s.payment;
  if (p.status === 'PAID' || p.status === 'PAYMENT_PROCESSING') redirect(`/operator/onboarding-payment/complete?payment=${p.id}`);

  return (
    <div className="max-w-3xl">
      <section className="relative isolate mb-10 overflow-hidden rounded-sm bg-night text-paper">
        <SceneImage plate={scene('cabin-warm')} sizes="60vw" drift={false} settle={false} />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/85 to-night/40" />
        <div className="relative p-8 md:p-12">
          <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">Onboarding fee · secure payment</p>
          <h1 className="font-display text-[40px] leading-[1.02] md:text-[52px]">{formatMinor(p.totalMinor, p.currency)}</h1>
          <p className="mt-3 text-[16px] text-paper/80">{p.operator.displayName}</p>
        </div>
      </section>

      {s.testMode && (
        <div className="mb-6">
          <Notice tone="warning" title="Test mode">This checkout uses Razorpay test keys. No real money moves; use Razorpay&apos;s test cards.</Notice>
        </div>
      )}

      {p.status !== 'PAYMENT_PENDING' ? (
        <Notice tone="info" title="This checkout is closed">
          It is no longer awaiting payment. <Link className="underline" href="/operator/onboarding-payment">Return to the onboarding fee</Link> to start again.
        </Notice>
      ) : (
        <RazorpayCheckout
          keyId={s.keyId}
          orderId={p.providerOrderId!}
          amountMinor={p.totalMinor}
          currency={p.currency}
          companyName={p.operator.displayName}
          customer={s.customer}
        />
      )}

      <p className="mt-8 text-[13px] leading-relaxed text-muted">
        Payment is processed by Razorpay. ThePrivate never sees or stores your card details. Paying the onboarding fee does not verify or activate your company; our team completes a final review.
      </p>
    </div>
  );
}
