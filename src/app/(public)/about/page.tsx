import type { Metadata } from 'next';
import { scene, SceneHero, SceneImage } from '@/components/cinematic/scene';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';

export const metadata: Metadata = { title: 'About', description: 'ThePrivate arranges private flights with checked, licensed flight partners, with clear prices and nothing booked by surprise.' };

const PROMISES = [
  ['Checked flight partners', 'Every flight partner is checked before it appears on ThePrivate: its operating licence, company registration and insurance.'],
  ['Clear prices', 'Estimates are always labelled as estimates. The price you pay is the one written in the offer you choose.'],
  ['Nothing by surprise', 'Asking is free. A flight is booked only when you choose an offer and the flight partner confirms it.'],
];

export default function About() {
  return (
    <>
      <SceneHero scene="cabin-aisle" size="full" eyebrow="About ThePrivate" title="Private flying," titleItalic="without the guesswork." lede="We arrange private flights in India and the UAE, with flight partners we have checked and prices you can read." />

      <section className="mx-auto max-w-[1320px] px-5 py-28 md:px-12">
        <ol className="grid gap-14 md:grid-cols-3">
          {PROMISES.map(([t, d], i) => (
            <Reveal as="li" key={t} index={i} className="border-t border-ink pt-7">
              <span className="strip text-[12px] text-magenta">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="font-display mt-5 text-[34px] leading-[1.05]">{t}</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{d}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="relative isolate overflow-hidden bg-night text-paper">
        <SceneImage plate={scene('window-light')} sizes="100vw" settle={false} />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/80 to-night/20" />
        <div className="relative mx-auto max-w-[1320px] px-5 py-32 md:px-12">
          <p className="reveal font-display max-w-2xl text-[40px] leading-[1.05] md:text-[60px]">
            We arrange the flight. <em>Licensed air operators fly it.</em>
          </p>
          <p className="reveal mt-6 max-w-xl text-[17px] leading-relaxed text-paper/75">
            ThePrivate is a marketplace and booking service, not an air operator. Every flight is operated by the licensed flight partner named in your offer.
          </p>
          <div className="reveal mt-10 flex flex-wrap gap-4">
            <LinkButton href="/charter" variant="light" size="lg" arrow>Plan a flight</LinkButton>
            <LinkButton href="/contact" variant="glass" size="lg">Talk to us</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
