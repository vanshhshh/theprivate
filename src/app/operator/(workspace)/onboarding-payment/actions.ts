'use server';

import { redirect } from 'next/navigation';
import type { FormState } from '@/components/ui/form';
import { runAction } from '@/server/action';
import { requireOperator } from '@/server/auth/viewer';
import { z } from 'zod';
import { cancelCheckout, completeSandboxCheckout, verifyCheckout } from '@/server/payments/onboarding/service';

const verifyInput = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid signature'),
});

/**
 * Called by the checkout modal's success handler. The server verifies the signature and reads the
 * payment from Razorpay itself; the browser's word is never taken for it.
 */
export async function verifyCheckoutAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireOperator('MANAGER');
    const v = verifyInput.parse(input);
    return verifyCheckout(ctx, { orderId: v.razorpay_order_id, paymentId: v.razorpay_payment_id, signature: v.razorpay_signature });
  });
}

export async function cancelCheckoutAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => cancelCheckout(await requireOperator('MANAGER'), String(fd.get('paymentId'))), 'Checkout cancelled. Nothing was charged.');
}

/** Development sandbox only (refused in production by the provider factory). */
export async function sandboxOutcomeAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireOperator('MANAGER');
  const outcome = String(fd.get('outcome')) as 'paid' | 'failed' | 'cancelled';
  const orderId = String(fd.get('orderId'));
  const paymentId = orderId.replace(/^sbx_order_/, '');
  const res = await runAction(async () => {
    if (!['paid', 'failed', 'cancelled'].includes(outcome)) throw new Error('bad outcome');
    return completeSandboxCheckout(ctx, orderId, outcome);
  });
  if (res.ok) redirect(`/operator/onboarding-payment/complete?payment=${encodeURIComponent(paymentId)}`);
  return res;
}
