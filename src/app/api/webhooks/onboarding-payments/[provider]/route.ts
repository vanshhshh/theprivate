import { NextResponse } from 'next/server';
import { log } from '@/server/log';
import { handleWebhook } from '@/server/payments/onboarding/service';

/**
 * Company onboarding fee webhooks (separate from charter booking payments). The raw body is
 * verified against the provider's signature before anything is read from it.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = await req.text();
  if (raw.length > 200_000) return NextResponse.json({ error: 'Too large' }, { status: 413 });
  try {
    const r = await handleWebhook(provider, raw, req.headers);
    if (r.status !== 200) log.warn({ provider, status: r.status }, 'onboarding payment webhook rejected');
    return NextResponse.json(r.body, { status: r.status });
  } catch (err) {
    log.error({ err, provider }, 'onboarding payment webhook failed');
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 }); // provider retries
  }
}
