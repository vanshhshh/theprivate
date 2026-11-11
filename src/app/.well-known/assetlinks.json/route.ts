import { NextResponse } from 'next/server';
import { androidAssetLinks } from '@/server/mobile/app-links';

export const dynamic = 'force-dynamic';

/** Android App Links. 404 until ANDROID_CERT_SHA256 is configured. */
export function GET() {
  const body = androidAssetLinks();
  if (!body) return new NextResponse('Not found', { status: 404 });
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
