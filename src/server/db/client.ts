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
    // DB_TX_TIMEOUT_MS lets one-off scripts run far from the database (e.g. from India to us-east-2).
    transactionOptions: { maxWait: 10_000, timeout: Number(process.env.DB_TX_TIMEOUT_MS) || 15_000 },
  });
}

/**
 * One client per process (survives Next.js dev hot reloads), created on FIRST USE rather than at
 * import: `next build` imports routes to collect their configuration, and a build must not need
 * a database (e.g. on Vercel before env vars exist). A missing DATABASE_URL still fails loudly the
 * moment a query is made.
 */
function client(): PrismaClient {
  return (globalForPrisma.prisma ??= create());
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === 'function' ? value.bind(c) : value;
  },
});

export type { TransactionClient as Tx } from '@/generated/prisma/internal/prismaNamespace';
