/**
 * Background worker: delivers queued notifications and runs expiry sweeps.
 *   npm run worker            (long-running)
 *   npm run worker -- --once  (single pass, e.g. from a cron)
 */
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const { claimJobs, runJob, runSweeps } = await import('@/server/jobs/worker');
const { log } = await import('@/server/log');
const { prisma } = await import('@/server/db/client');

const once = process.argv.includes('--once');
let stopping = false;
process.on('SIGINT', () => (stopping = true));
process.on('SIGTERM', () => (stopping = true));

let lastSweep = 0;
async function tick() {
  if (Date.now() - lastSweep > 60_000) {
    const r = await runSweeps();
    if (Object.values(r).some((n) => n > 0)) log.info(r, 'sweeps');
    lastSweep = Date.now();
  }
  const jobs = await claimJobs(20);
  for (const j of jobs) await runJob(j);
  return jobs.length;
}

do {
  try {
    const n = await tick();
    if (once) break;
    if (n === 0) await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    log.error({ err }, 'worker tick failed');
    if (once) process.exitCode = 1;
    await new Promise((r) => setTimeout(r, 5000));
  }
} while (!stopping && !once);

await prisma.$disconnect();
