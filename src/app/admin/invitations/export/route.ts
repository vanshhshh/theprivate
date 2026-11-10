import { NextResponse } from 'next/server';
import { getViewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

const cell = (v: unknown) => {
  const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  // Quote, and neutralise spreadsheet formula injection.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** Campaign results as CSV. Contains no tokens (only hashes exist, and they are not exported). */
export async function GET(req: Request) {
  const v = await getViewer();
  if (!v?.permissions.has('invite.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const campaignId = new URL(req.url).searchParams.get('campaign') ?? undefined;
  const rows = await prisma.operatorInvitation.findMany({
    where: { isTest: false, ...(campaignId ? { campaignId } : {}) },
    include: { operator: { select: { displayName: true, countryCode: true, lifecycle: true } }, campaign: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const head = ['campaign', 'company', 'country', 'company_status', 'recipient', 'invitation_status', 'sent_at', 'expires_at', 'link_first_visited_at', 'claimed_at', 'claim_id', 'last_error'];
  const lines = [head.join(','), ...rows.map((r) => [r.campaign?.name, r.operator.displayName, r.operator.countryCode, r.operator.lifecycle, r.email, r.status, r.sentAt, r.expiresAt, r.firstVisitedAt, r.claimedAt, r.claimId, r.lastError].map(cell).join(','))];
  return new NextResponse(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="invitations${campaignId ? `-${campaignId}` : ''}.csv"`, 'Cache-Control': 'no-store' } });
}
