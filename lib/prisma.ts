import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const g = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
export const db = g.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") g.prisma = db;
