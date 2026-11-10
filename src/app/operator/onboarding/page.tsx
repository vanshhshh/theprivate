import Link from 'next/link';
import { Status } from '@/components/domain/status';
import { LinkButton } from '@/components/ui/button';
import { Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { ClaimFields } from './claim-fields';
import { formatDate } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { claimDirectory } from '@/server/services/operators';
import { claimAction } from '../actions';

export const metadata = { title: 'Join as an operator' };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const v = await requireViewerPage('/operator/onboarding');
  const [results, claims] = await Promise.all([
    q ? claimDirectory(q) : Promise.resolve([]),
    prisma.operatorClaim.findMany({ where: { userId: v.user.id }, include: { operator: { select: { legalName: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  return (
    <>
        <PageHeader eyebrow="Operators" title="Set up your operator workspace" lede="Find your company in our directory of licensed operators and claim it, or ask us to create a new profile. Every claim is reviewed by our supply team. Submitting one does not give you access by itself." />
        {v.memberships.length > 0 && <div className="mb-10"><Notice tone="success">You already belong to an operator. <Link className="underline" href="/operator">Open the workspace →</Link></Notice></div>}

        {claims.length > 0 && (
          <section className="mb-14">
            <SectionTitle>Your claims</SectionTitle>
            <ul className="divide-y divide-line">
              {claims.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>{c.operator?.legalName ?? c.proposedName} <span className="text-sm text-muted">· {formatDate(c.createdAt)}</span>{c.decisionNote && <span className="block text-sm text-ink-2">“{c.decisionNote}”</span>}</span>
                  <Status kind="claim" value={c.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {(
          <div className="grid gap-14 md:grid-cols-2">
            <section>
              <SectionTitle>Find your company</SectionTitle>
              <form className="flex gap-3" action="/operator/onboarding">
                <input name="q" defaultValue={q} placeholder="Company name" className="flex-1 border-0 border-b border-line-strong bg-transparent py-2.5 focus:border-ink focus:outline-none" aria-label="Company name" />
                <button className="border border-ink px-4 text-sm hover:bg-ink hover:text-paper">Search</button>
              </form>
              {q && (
                <ul className="mt-4 divide-y divide-line">
                  {results.length === 0 && <li className="py-3 text-sm text-muted">No match. Request a new profile instead.</li>}
                  {results.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <span>{r.legalName} <span className="strip text-xs text-muted">{r.countryCode}</span></span>
                      {r._count.memberships > 0 ? <span className="text-xs text-muted">Already claimed: contact support</span> : <LinkButton size="sm" variant="secondary" href={`/operator/onboarding/claim/${r.id}`}>Claim</LinkButton>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <SectionTitle>Not listed? Request a profile</SectionTitle>
              <ActionForm action={claimAction} className="grid gap-6">
                <Field name="proposedName" label="Registered company name"><Input name="proposedName" required /></Field>
                <Field name="proposedCountry" label="Country of operation">
                  <Select name="proposedCountry" defaultValue="IN"><option value="IN">India</option><option value="AE">United Arab Emirates</option><option value="SG">Singapore</option><option value="GB">United Kingdom</option><option value="US">United States</option></Select>
                </Field>
                <ClaimFields />
                <SubmitButton variant="secondary">Request profile</SubmitButton>
              </ActionForm>
            </section>
          </div>
        )}
    </>
  );
}
