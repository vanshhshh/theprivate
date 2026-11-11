import { prisma } from '@/server/db/client';
import { emailProvider } from '@/server/integrations/messaging';
import { invitationSweeps, markInvitationFailed, processInvitationJob } from '@/server/invitations/service';
import { log } from '@/server/log';
import { processEmailJob } from '@/server/email/outbox';
import { deliverPush } from '@/server/push/devices';

/** Claims up to `limit` due jobs atomically (FOR UPDATE SKIP LOCKED: safe with many workers). */
export async function claimJobs(limit = 10) {
  return prisma.$queryRaw<{ id: string; type: string; payload: unknown; attempts: number; maxAttempts: number }[]>`
    UPDATE "Job" SET status = 'RUNNING', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Job" WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, attempts, "maxAttempts"`;
}

async function deliverNotification(deliveryId: string) {
  const d = await prisma.notificationDelivery.findUnique({ where: { id: deliveryId }, include: { notification: { include: { user: { select: { email: true } } } } } });
  if (!d || d.status !== 'QUEUED') return;
  if (d.channel === 'PUSH') {
    const n = d.notification;
    const r = await deliverPush({ id: n.id, userId: n.userId, type: n.type, link: n.link });
    await prisma.notificationDelivery.update({ where: { id: d.id }, data: { status: r.status, providerRef: 'providerRef' in r ? r.providerRef : null, error: 'error' in r ? r.error : null, attempts: { increment: 1 } } });
    return;
  }
  if (d.channel !== 'EMAIL') {
    await prisma.notificationDelivery.update({ where: { id: d.id }, data: { status: 'SKIPPED_NOT_CONFIGURED', attempts: { increment: 1 } } });
    return;
  }
  const provider = emailProvider();
  if (!provider) {
    await prisma.notificationDelivery.update({ where: { id: d.id }, data: { status: 'SKIPPED_NOT_CONFIGURED', attempts: { increment: 1 } } });
    return;
  }
  const base = process.env.BETTER_AUTH_URL ?? '';
  const n = d.notification;
  const { providerRef } = await provider.send({ to: n.user.email, subject: n.title, text: `${n.body}${n.link ? `\n\n${base}${n.link}` : ''}\n\n— ThePrivate` });
  await prisma.notificationDelivery.update({ where: { id: d.id }, data: { status: 'SENT', providerRef, attempts: { increment: 1 } } });
}

export async function runJob(job: { id: string; type: string; payload: unknown; attempts: number; maxAttempts: number }) {
  try {
    if (job.type === 'notification.deliver') await deliverNotification((job.payload as { deliveryId: string }).deliveryId);
    else if (job.type === 'invitation.send') await processInvitationJob((job.payload as { invitationId: string }).invitationId);
    else if (job.type === 'email.send') await processEmailJob(job.payload);
    else throw new Error(`Unknown job type ${job.type}`);
    await prisma.job.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', lockedAt: null } });
  } catch (err) {
    const dead = job.attempts >= job.maxAttempts;
    log.warn({ err, jobId: job.id, type: job.type }, 'job failed');
    await prisma.job.update({ where: { id: job.id }, data: { status: dead ? 'DEAD' : 'PENDING', lockedAt: null, lastError: String(err).slice(0, 1000), runAt: new Date(Date.now() + 2 ** job.attempts * 30_000) } });
    if (dead && job.type === 'invitation.send') await markInvitationFailed((job.payload as { invitationId: string }).invitationId, String(err)).catch(() => {});
    if (dead && job.type === 'notification.deliver') {
      await prisma.notificationDelivery.update({ where: { id: (job.payload as { deliveryId: string }).deliveryId }, data: { status: 'FAILED', error: String(err).slice(0, 500) } }).catch(() => {});
    }
  }
}

/**
 * Time-based state changes. Each is a single conditional UPDATE, so it is idempotent and safe to
 * run concurrently. Nothing here ever moves something INTO an available/bookable state.
 */
export async function runSweeps(now = new Date()) {
  const quotes = await prisma.quote.updateMany({ where: { status: { in: ['SUBMITTED', 'REVISED'] }, validUntil: { lt: now } }, data: { status: 'EXPIRED' } });
  const rfqs = await prisma.rfq.updateMany({ where: { status: { in: ['SUBMITTED', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'] }, expiresAt: { lt: now } }, data: { status: 'EXPIRED' } });
  const emptyLegs = await prisma.emptyLegListing.updateMany({ where: { status: 'PUBLISHED', validUntil: { lt: now } }, data: { status: 'EXPIRED' } });
  const stale = await prisma.job.updateMany({ where: { status: 'RUNNING', lockedAt: { lt: new Date(now.getTime() - 10 * 60_000) } }, data: { status: 'PENDING', lockedAt: null } });
  const inv = await invitationSweeps(now);
  return { quotesExpired: quotes.count, rfqsExpired: rfqs.count, emptyLegsExpired: emptyLegs.count, jobsRecovered: stale.count, ...inv };
}
