import 'server-only';
import { after } from 'next/server';

/**
 * Delivers queued work (push, e-mail) right after the current response instead of waiting for the
 * next cron or GitHub Actions tick, which can be hours apart on a quiet repository. The job queue
 * stays the source of truth: jobs are claimed with FOR UPDATE SKIP LOCKED, so this, the cron and
 * the worker can never deliver the same job twice, and anything not finished here is picked up by
 * the next scheduled run. Only jobs that are already due run (staggered invitation sends keep
 * their spacing).
 */
export function kickQueue() {
  try {
    after(async () => {
      const { claimJobs, runJob } = await import('./worker');
      const jobs = await claimJobs(10);
      for (const j of jobs) await runJob(j);
    });
  } catch {
    // Not inside a request (scripts, tests, the worker itself): the scheduled runs deliver it.
  }
}
