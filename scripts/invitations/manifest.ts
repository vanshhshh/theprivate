/**
 * DRY RUN: builds the invitation recipient manifest from the database. Sends nothing and writes
 * nothing to the database. Output (contains business e-mail addresses, git-ignored):
 *   reports/invitations/manifest-<date>.csv, summary-<date>.json, samples-<date>.txt
 *   npm run invitations:manifest
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const { listCandidates } = await import('@/server/invitations/service');
const { composeInvitation } = await import('@/domain/invitations/compose');
const { prisma } = await import('@/server/db/client');

const all = await listCandidates();
const day = new Date().toISOString().slice(0, 10);
const dir = 'reports/invitations';
mkdirSync(dir, { recursive: true });

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [['company', 'country', 'category', 'eligible', 'recipient', 'recipient_name', 'source', 'confidence', 'free_mail', 'on_company_domain', 'reasons'].join(',')];
for (const c of all) {
  const r = c.eligibility.recipient;
  rows.push([c.name, c.countryCode, c.categoryLabel, c.eligibility.eligible, r?.email, r?.name, r?.source, r?.confidence, r?.genericDomain, r?.domainMatchesWebsite, c.eligibility.reasons.join('; ')].map(q).join(','));
}
writeFileSync(`${dir}/manifest-${day}.csv`, rows.join('\n'));

const eligible = all.filter((c) => c.eligibility.eligible);
const tally = (xs: string[]) => xs.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {});
const reasons = tally(all.filter((c) => !c.eligibility.eligible).flatMap((c) => c.eligibility.reasons.map((r) => r.replace(/\(.*\)/, '(…)'))));
const summary = {
  generatedAt: new Date().toISOString(),
  database: new URL(process.env.DATABASE_URL!).host,
  companies: all.length,
  eligible: eligible.length,
  eligibleByCountry: tally(eligible.map((c) => c.countryCode)),
  eligibleBySource: tally(eligible.map((c) => c.eligibility.recipient!.source)),
  eligibleFreeMail: eligible.filter((c) => c.eligibility.recipient!.genericDomain).length,
  eligibleNamedGreeting: eligible.filter((c) => c.eligibility.recipient!.name).length,
  notEligible: all.length - eligible.length,
  byCategory: tally(all.map((c) => c.categoryLabel)),
  notEligibleReasons: reasons,
  suppressed: await prisma.emailSuppression.count(),
};
writeFileSync(`${dir}/summary-${day}.json`, JSON.stringify(summary, null, 2));

const links = { claimUrl: 'https://theprivate.in/claim/<unique-link-generated-at-send>', unsubscribeUrl: 'https://theprivate.in/unsubscribe?e=…&s=…', expiresAt: new Date(Date.now() + 21 * 86_400_000), appUrl: 'https://theprivate.in' };
const sender = { name: 'ThePrivate', postalAddress: process.env.SENDER_POSTAL_ADDRESS ?? '[SENDER_POSTAL_ADDRESS — required before sending]', replyTo: null };
const pickSamples = [eligible.find((c) => c.countryCode === 'AE'), eligible.find((c) => c.eligibility.recipient?.name), eligible.find((c) => c.eligibility.recipient?.genericDomain), eligible[0]].filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).slice(0, 4);
writeFileSync(`${dir}/samples-${day}.txt`, pickSamples.map((c) => { const m = composeInvitation(c!.facts!, links, sender); return `To: ${c!.facts!.recipientEmail}\nSubject: ${m.subject}\n\n${m.text}`; }).join('\n\n========================================\n\n'));

console.log(JSON.stringify(summary, null, 2));
await prisma.$disconnect();
