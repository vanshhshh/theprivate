import { NextResponse } from 'next/server';
import { log } from '@/server/log';

/**
 * Payment provider webhook boundary (Razorpay / Stripe). Inactive until credentials and
 * signature secrets are configured: requests are rejected, and bookings can never be marked
 * PAID through this route in the current pre-payment mode.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  log.warn({ provider }, 'payment webhook received but no provider is configured');
  return NextResponse.json({ error: 'Payment provider not configured' }, { status: 501 });
}
