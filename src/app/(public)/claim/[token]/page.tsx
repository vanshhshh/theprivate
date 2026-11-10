import type { Metadata } from 'next';
import Link from 'next/link';
import { SceneHero } from '@/components/cinematic/scene';
import { LinkButton } from '@/components/ui/button';
import { Notice } from '@/components/ui/display';
import { getViewer } from '@/server/auth/viewer';
import { viewInvitation } from '@/server/invitations/service';
import { ClaimForm } from './claim-form';

export const metadata: Metadata = { title: 'Your company invitation', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const COUNTRY: Record<string, string> = { IN: 'India', AE: 'United Arab Emirates' };
const mask = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, '$1•••$2');

const STEPS = ['Review your company details', 'Sign in with the invited address', 'Claim the profile', 'Complete onboarding'];

/**
 * The invitation landing page. Rendering it never consumes the link: mail scanners and link
 * previews can fetch it safely. Claiming is a separate, signed-in POST.
 */
export default async function ClaimInvitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [view, viewer] = await Promise.all([viewInvitation(token), getViewer()]);

  if (view.state === 'invalid') {
    return (
      <>
        <SceneHero scene="window-light" size="band" eyebrow="Company invitation" title="This link" titleItalic="isn't valid." lede="It may have been mistyped or replaced by a newer invitation." />
        <section className="mx-auto max-w-[900px] px-5 py-16 md:px-12">
          <p className="text-[17px] text-ink-2">If you expected an invitation for your company, reply to the e-mail you received or <Link className="link-draw text-ink" href="/contact">contact us</Link>.</p>
        </section>
      </>
    );
  }

  const c = view.company;
  const closed: Partial<Record<typeof view.state, { title: string; body: string }>> = {
    test: { title: 'This is a test invitation', body: 'Test invitations show what a company receives. They cannot be used to claim a profile.' },
    revoked: { title: 'This invitation was withdrawn', body: 'Please contact us if you believe this is a mistake.' },
    expired: { title: 'This invitation has expired', body: 'Contact us and we will send you a new link.' },
    claimed: { title: 'This invitation has already been used', body: 'The profile claim is with our team for review.' },
    unsubscribed: { title: 'This address has unsubscribed', body: 'We will not send further invitations to it. Contact us if you would like to proceed.' },
    has_owner: { title: 'This company already has an account holder', body: 'Contact us if you need access for your team.' },
  };
  const blocked = closed[view.state];
  const matches = viewer && viewer.user.email.toLowerCase() === view.email;
  const next = encodeURIComponent(`/claim/${token}`);

  return (
    <>
      <SceneHero scene="cabin-warm" size="band" eyebrow="Company invitation" title={c.name} lede="Your company's profile on ThePrivate, prepared from public records. Review it, then claim it." />
      <div className="mx-auto grid max-w-[1320px] gap-14 px-5 py-16 md:px-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="details">
          <h2 id="details" className="font-display mb-6 text-[32px] leading-tight">What we have on record</h2>
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-line sm:grid-cols-2">
            {[
              ['Registered name', c.legalName],
              ['Country', COUNTRY[c.countryCode] ?? c.countryCode],
              ['Website', c.website],
              ['Regulator listing', c.authorizations.length ? c.authorizations.map((a) => `${a.authority}${a.numberRaw ? ` ${a.numberRaw}` : ''}`).join(' · ') : null],
              ['Aircraft in public records', c.aircraftCount ? String(c.aircraftCount) : null],
              ['Invitation sent to', mask(view.email)],
            ].map(([k, val]) => (
              <div key={k} className="bg-paper p-5">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="mt-1.5 text-[17px] break-words">{val ?? <span className="text-muted">Not on record</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[14px] leading-relaxed text-muted">
            Something wrong or missing? You can correct it once you have claimed the profile. Claiming does not verify or publish your company: our team reviews the required documents first.
          </p>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm bg-night p-7 text-paper md:p-9">
            <ol className="mb-8 flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-baseline gap-3 text-[15px]">
                  <span className="strip text-[11px] text-dusk">{String(i + 1).padStart(2, '0')}</span>
                  <span className={i === 0 || (i === 1 && matches) ? 'text-paper' : 'text-paper/60'}>{s}</span>
                </li>
              ))}
            </ol>

            {blocked ? (
              <div className="text-ink"><Notice tone="warning" title={blocked.title}>{blocked.body} <Link className="underline" href="/contact">Contact us</Link>.</Notice></div>
            ) : !viewer ? (
              <>
                <p className="mb-6 text-[15px] leading-relaxed text-paper/80">Sign in or create an account with <strong className="text-paper">{mask(view.email)}</strong>, the address this invitation was sent to.</p>
                <div className="flex flex-wrap gap-3">
                  <LinkButton href={`/sign-up?next=${next}`} variant="light" arrow>Create an account</LinkButton>
                  <LinkButton href={`/sign-in?next=${next}`} variant="glass">Sign in</LinkButton>
                </div>
              </>
            ) : !matches ? (
              <div className="text-ink">
                <Notice tone="warning" title="Different address">
                  You are signed in as {viewer.user.email}. This invitation is for {mask(view.email)}. Sign out and sign in with that address to continue.
                </Notice>
              </div>
            ) : (
              <ClaimForm token={token} company={c.name} />
            )}
            {view.expiresAt && !blocked && <p className="mt-6 text-[13px] text-paper/50">This link is personal to {c.name} and expires on {view.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
