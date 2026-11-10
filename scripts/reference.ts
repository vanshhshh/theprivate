import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { importAirports } = await import('@/server/reference/airports');
const { prisma } = await import('@/server/db/client');
console.log(await importAirports());
await prisma.$disconnect();
