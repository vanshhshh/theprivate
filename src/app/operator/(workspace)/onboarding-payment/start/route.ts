import { NextResponse } from 'next/server';
import { requireOperator } from '@/server/auth/viewer';
import { AppError } from '@/server/errors';
import { captureException } from '@/server/log';
import { startCheckout } from '@/server/payments/onboarding/service';

export const dynamic = 'force-dynamic';

const BACK = '/operator/onboarding-payment';

/**
 * Starts (or resumes) the onboarding-fee checkout from a plain form POST and answers with a 303, so
 * the checkout page loads as a full document. That matters: the page's Content-Security-Policy,
 * which admits Razorpay's script and iframe, applies only to documents loaded at that URL, never to
 * client-side navigations from other pages. The amount is never read from the request.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  // Same-origin form posts only (server actions get this check from Next.js; route handlers do not).
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const back = (reason: string) => NextResponse.redirect(new URL(`${BACK}?checkout=${reason}`, url), 303);
  try {
    const payment = await startCheckout(await requireOperator('MANAGER'));
    if (!payment.checkoutUrl) return back('unavailable');
    const target = payment.checkoutUrl.startsWith('/') ? new URL(payment.checkoutUrl, url) : new URL(payment.checkoutUrl);
    return NextResponse.redirect(target, 303);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHENTICATED') return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(BACK)}`, url), 303);
      if (err.code === 'CONFLICT') return back('paid');
      if (err.code === 'FORBIDDEN') return back('forbidden');
      return back('unavailable');
    }
    captureException(err);
    return back('error');
  }
}
