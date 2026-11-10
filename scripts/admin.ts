/**
 * Bootstrap staff roles from the CLI (the first SUPER_ADMIN cannot be granted from the UI).
 *   npm run admin:grant -- <email> <ROLE>
 * The user must already have signed up. The grant is audited.
 */
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const { prisma } = await import('@/server/db/client');

const [email, role = 'SUPER_ADMIN'] = process.argv.slice(2);
const ROLES = ['SUPER_ADMIN', 'OPERATIONS', 'SUPPLY', 'SALES_DESK', 'DATA_STEWARD', 'SUPPORT'] as const;
if (!email || !ROLES.includes(role as (typeof ROLES)[number])) {
  console.error(`Usage: npm run admin:grant -- <email> <${ROLES.join('|')}>`);
  process.exit(2);
}
const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
if (!user) {
  console.error(`No user ${email}. Sign up first.`);
  process.exit(1);
}
const existing = await prisma.staffRoleAssignment.findFirst({ where: { userId: user.id, role: role as (typeof ROLES)[number], revokedAt: null } });
if (existing) console.log(`${email} already has ${role}.`);
else {
  await prisma.staffRoleAssignment.create({ data: { userId: user.id, role: role as (typeof ROLES)[number] } });
  await prisma.auditEvent.create({ data: { actorType: 'SYSTEM', action: 'role.grant.cli', entityType: 'User', entityId: user.id, after: { role } } });
  console.log(`Granted ${role} to ${email}.`);
}
await prisma.$disconnect();
