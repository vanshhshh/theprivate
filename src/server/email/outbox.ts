import 'server-only';
import { kickQueue } from '@/server/jobs/kick';
import { Prisma } from '@/generated/prisma/client';
import { prisma, type Tx } from '@/server/db/client';
import { log } from '@/server/log';
import { mailerStatus, sendEmail } from './mailer';

export interface QueuedEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Queues a transactional e-mail as a job. `dedupeKey` is unique: the same logical message
 * (e.g. "receipt for payment X") is queued at most once, however often the trigger repeats.
 */
export async function enqueueEmail(tx: Tx | typeof prisma, msg: QueuedEmail, dedupeKey: string) {
  try {
    await tx.job.create({ data: { type: 'email.send', payload: msg as never, dedupeKey: `email:${dedupeKey}`, maxAttempts: 5 } });
    kickQueue();
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false; // already queued
    throw err;
  }
}

export async function processEmailJob(payload: unknown) {
  const msg = payload as QueuedEmail;
  if (!mailerStatus().configured) {
    log.warn({ to: msg.to.replace(/^[^@]+/, '***') }, 'e-mail not sent: SMTP is not configured');
    return; // recorded as a no-op; nothing pretends it was delivered
  }
  await sendEmail(msg);
}
