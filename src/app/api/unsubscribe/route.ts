import { NextResponse } from 'next/server';
import { suppress } from '@/server/invitations/service';
import { readUnsubscribe } from '@/server/invitations/tokens';

/**
 * RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). Mail providers POST here; the signed
 * parameters identify the address. A GET only redirects to the confirmation page, so scanners
 * that follow links never unsubscribe anyone.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = readUnsubscribe(url.searchParams.get('e'), url.searchParams.get('s'));
  if (!email) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  await suppress(email, 'UNSUBSCRIBED', 'one-click');
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(new URL(`/unsubscribe?${url.searchParams.toString()}`, url.origin), 303);
}
