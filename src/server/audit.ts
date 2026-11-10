import 'server-only';
import { headers } from 'next/headers';
import type { ActorType } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { prisma, type Tx } from '@/server/db/client';

interface AuditInput {
  actorUserId: string | null;
  actorType?: ActorType;
  action: string; // e.g. "operator.lifecycle.change"
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

async function requestMeta() {
  try {
    const h = await headers();
    return { ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: h.get('user-agent'), requestId: h.get('x-request-id') };
  } catch {
    return { ipAddress: null, userAgent: null, requestId: null }; // outside a request (worker, CLI)
  }
}

/** Append-only audit trail. Pass the transaction so the audit row commits with the change. */
export async function audit(input: AuditInput, tx: Tx | typeof prisma = prisma) {
  const meta = await requestMeta();
  await tx.auditEvent.create({
    data: {
      actorType: input.actorType ?? (input.actorUserId ? 'USER' : 'SYSTEM'),
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: json(input.before),
      after: json(input.after),
      ...meta,
    },
  });
}
