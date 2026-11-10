import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Hosted Postgres (Neon) adds network round trips and can resume from scale-to-zero, so the
    // 5 s interactive-transaction default is too tight. Calls that pass their own options
    // (e.g. the data import) still override this.
    transactionOptions: { maxWait: 10_000, timeout: 15_000 },
  });
}

/** One client per process (survives Next.js dev hot reloads). */
export const prisma: PrismaClient = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type { TransactionClient as Tx } from '@/generated/prisma/internal/prismaNamespace';
