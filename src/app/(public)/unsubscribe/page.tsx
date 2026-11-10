import type { Metadata } from 'next';
import { SceneHero } from '@/components/cinematic/scene';
import { readUnsubscribe } from '@/server/invitations/tokens';
import { UnsubscribeForm } from './unsubscribe-form';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** GET shows a confirmation only: link scanners can open it without unsubscribing anyone. */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; s?: string }> }) {
  const { e, s } = await searchParams;
  const email = readUnsubscribe(e, s);
  return (
    <>
      <SceneHero scene="sky-descent" size="band" eyebrow="Unsubscribe" title="Stop company" titleItalic="invitations." />
      <section className="mx-auto max-w-[760px] px-5 py-16 md:px-12">
        {email ? (
          <>
            <p className="mb-8 text-[17px] leading-relaxed text-ink-2">
              Confirm and we will stop sending ThePrivate company invitations to <strong className="text-ink">{email.replace(/^(.)[^@]*(@.*)$/, '$1•••$2')}</strong>. This takes effect immediately.
            </p>
            <UnsubscribeForm e={e!} s={s!} />
          </>
        ) : (
          <p className="text-[17px] text-ink-2">This unsubscribe link is not valid. Reply to the e-mail you received and we will remove your address by hand.</p>
        )}
      </section>
    </>
  );
}
