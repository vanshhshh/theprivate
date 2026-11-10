'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { verifyCheckoutAction } from '../../actions';

type SuccessResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type FailedResponse = { error?: { description?: string; reason?: string } };
type RazorpayInstance = { open(): void; on(event: 'payment.failed', cb: (r: FailedResponse) => void): void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

type Phase = 'loading' | 'ready' | 'open' | 'verifying' | 'dismissed' | 'failed' | 'error';

/**
 * Razorpay Standard Checkout. The order (amount, currency) was created on the server; this only
 * opens Razorpay's modal for it and hands the signed result back to the server for verification.
 * Only the public key id reaches the browser.
 */
export function RazorpayCheckout(props: {
  keyId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  companyName: string;
  customer: { name: string; email: string };
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const opened = useRef(false);

  const verify = useCallback(
    async (r: SuccessResponse) => {
      setPhase('verifying');
      setMessage(null);
      const res = await verifyCheckoutAction(r);
      if (res.ok) {
        router.replace(`/operator/onboarding-payment/complete?payment=${encodeURIComponent(res.data.paymentId)}`);
        return;
      }
      setPhase('error');
      setMessage(res.error);
    },
    [router],
  );

  const open = useCallback(() => {
    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      setPhase('error');
      setMessage('The secure payment window could not be loaded. Check your connection or disable content blockers, then try again.');
      return;
    }
    const rzp = new Razorpay({
      key: props.keyId,
      order_id: props.orderId,
      amount: props.amountMinor,
      currency: props.currency,
      name: 'ThePrivate',
      description: `Company onboarding fee · ${props.companyName}`,
      prefill: { name: props.customer.name, email: props.customer.email },
      notes: { purpose: 'company-onboarding-fee' },
      theme: { color: '#0f141a' },
      handler: (r: SuccessResponse) => void verify(r),
      modal: {
        ondismiss: () => {
          setPhase((p) => (p === 'verifying' ? p : 'dismissed'));
        },
      },
    });
    rzp.on('payment.failed', (r) => {
      // The customer can retry inside the modal; the order stays open until it is paid.
      setPhase('failed');
      setMessage(r.error?.description || 'The payment was declined.');
    });
    setPhase('open');
    setMessage(null);
    rzp.open();
  }, [props, verify]);

  // Open the modal once, as soon as the script is ready (the user already chose "Pay securely").
  useEffect(() => {
    if (phase === 'ready' && !opened.current) {
      opened.current = true;
      open();
    }
  }, [phase, open]);

  const busy = phase === 'loading' || phase === 'open' || phase === 'verifying';

  return (
    <div className="rounded-sm bg-night p-7 text-paper">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setPhase((p) => (p === 'loading' ? 'ready' : p))}
        onError={() => {
          setPhase('error');
          setMessage('The secure payment window could not be loaded. Check your connection or disable content blockers, then try again.');
        }}
      />
      <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">Secure payment</p>
      <p aria-live="polite" className="text-[15px] leading-relaxed text-paper/85">
        {phase === 'loading' && 'Opening the secure payment window…'}
        {phase === 'ready' && 'Ready to pay.'}
        {phase === 'open' && 'Complete the payment in the Razorpay window.'}
        {phase === 'verifying' && 'Confirming your payment with Razorpay…'}
        {phase === 'dismissed' && 'The payment window was closed. Nothing was charged.'}
        {phase === 'failed' && `The payment did not go through: ${message} You can try again; nothing was charged for the failed attempt.`}
        {phase === 'error' && message}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="button" onClick={open} disabled={busy} aria-busy={busy} className={buttonClass('primary', 'md', 'h-13 min-w-56')}>
          {phase === 'verifying' ? 'Confirming…' : phase === 'dismissed' || phase === 'failed' || phase === 'error' ? 'Try again' : 'Pay securely'}
        </button>
        <Link href="/operator/onboarding-payment" className="text-[13px] text-paper/60 underline underline-offset-4 hover:text-paper" prefetch={false}>
          Back to onboarding fee
        </Link>
      </div>
    </div>
  );
}
