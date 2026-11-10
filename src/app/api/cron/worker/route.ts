import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { claimJobs, runJob, runSweeps } from '@/server/jobs/worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One bounded pass of the background queue, for hosts without a long-running worker (Vercel Cron
 * or any scheduler). Requires `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET it is off.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 404 });
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sweeps = await runSweeps();
  const jobs = await claimJobs(10);
  for (const j of jobs) await runJob(j);
  return NextResponse.json({ ok: true, jobs: jobs.length, sweeps });
}
