import type { Metadata } from 'next';
import { SceneHero } from '@/components/cinematic/scene';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Partner with ThePrivate', description: 'For licensed air operators: receive qualified charter requests, quote on your terms and publish empty legs.' };

const STEPS = [
  ['Claim', 'Find your company in our directory of DGCA- and GCAA-licensed operators, or request a new profile. We confirm you represent the company.'],
  ['Verify', 'Upload your operating certificate, company registration and insurance. We check them and confirm your certificate against the regulator record.'],
  ['Agree', 'Sign a plain commercial agreement. Our fee is added on top of your price, so you are paid what you quote.'],
  ['Go live', 'Confirm your fleet, keep availability current, and answer requests routed to your approved aircraft. Publish empty legs in a minute.'],
];

/** A business page for air operators: precise operational language is appropriate here. */
export default function ForOperators() {
  return (
    <>
      <SceneHero scene="jets-ramp" eyebrow="For air operators" title="Qualified requests," titleItalic="on your terms." lede="We send you requests only when one of your approved aircraft fits. You set the price, the inclusions and the validity. Nothing is booked until you confirm.">
        <LinkButton href="/operator/onboarding" prefetch={false} variant="light" size="lg" arrow>Claim your profile</LinkButton>
      </SceneHero>
      <section className="mx-auto max-w-[1320px] px-5 py-24 md:px-12">
        <ol className="grid gap-12 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <Reveal as="li" key={t} index={i} className="border-t border-ink pt-6">
              <span className="strip text-[12px] text-magenta">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="font-display mt-5 text-[32px] leading-none">{t}</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{d}</p>
            </Reveal>
          ))}
        </ol>
        <div className="mt-24 grid gap-14 md:grid-cols-2">
          <div className="reveal">
            <h2 className="font-display text-[36px] leading-tight">Your data <em>stays yours</em></h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2">Your hourly rates are never shown to customers. Your documents are visible only to your team and our verification staff. Imported records about your fleet are marked unconfirmed until you confirm them.</p>
          </div>
          <div className="reveal">
            <h2 className="font-display text-[36px] leading-tight">Already <em>listed?</em></h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2">Our directory of licensed operators is built from public regulator records. If your company appears there, claim it rather than creating a new profile, so its history stays in one place.</p>
          </div>
        </div>
      </section>
    </>
  );
}
