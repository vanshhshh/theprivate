import { NextResponse } from 'next/server';
import { appleAppSiteAssociation } from '@/server/mobile/app-links';

export const dynamic = 'force-dynamic';

/** iOS Universal Links. 404 until APPLE_TEAM_ID is configured. */
export function GET() {
  const body = appleAppSiteAssociation();
  if (!body) return new NextResponse('Not found', { status: 404 });
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
