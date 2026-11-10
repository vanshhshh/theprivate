import Link from 'next/link';
import { scene, SceneImage, type SceneKey } from '@/components/cinematic/scene';
import { FlightFilm } from '@/components/cinematic/flight-film';
import { CharterSearch } from '@/components/domain/charter-search';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { prisma } from '@/server/db/client';
import { LIVE_EMPTY_LEG_WHERE } from '@/server/services/empty-legs';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Real counts only. A zero is presented honestly, never padded.
  const [airports, activeOperators, liveEmptyLegs, liveListings] = await Promise.all([
    prisma.airport.count({ where: { isActive: true } }),
    prisma.operator.count({ where: { lifecycle: 'ACTIVE', deletedAt: null } }),
    prisma.emptyLegListing.count({ where: LIVE_EMPTY_LEG_WHERE() }),
    prisma.saleListing.count({ where: { status: 'PUBLISHED' } }),
  ]);

  const chapters: { scene: SceneKey; eyebrow: string; title: string; text: string; href: string; cta: string }[] = [
    {
      scene: 'wing-dusk',
      eyebrow: liveEmptyLegs ? `${liveEmptyLegs} live ${liveEmptyLegs === 1 ? 'offer' : 'offers'}` : 'One-way offers',
      title: 'Already flying your way',
      text: liveEmptyLegs ? 'Seats on private flights that are going anyway.' : 'Seats on flights going anyway, published by flight partners as they appear.',
      href: '/empty-legs',
      cta: 'See one-way offers',
    },
    {
      scene: 'ramp-dusk',
      eyebrow: liveListings ? `${liveListings} ${liveListings === 1 ? 'aircraft' : 'aircraft'} listed` : 'Aircraft for sale',
      title: 'An aircraft of your own',
      text: 'Every listing reviewed by ThePrivate before it appears.',
      href: '/aircraft-for-sale',
      cta: 'Browse aircraft',
    },
    {
      scene: 'flight-deck',
      eyebrow: activeOperators ? `${activeOperators} flight ${activeOperators === 1 ? 'partner' : 'partners'}` : 'Flight partners',
      title: 'The people who fly you',
      text: 'Licensed air operators, each checked before they appear.',
      href: '/operators',
      cta: 'Meet our partners',
    },
  ];

  return (
    <>
      <FlightFilm />

      {/* The film ends on the route map: the planner continues on the same night map. */}
      <section id="plan" aria-label="Plan a flight" className="scroll-mt-0">
        <CharterSearch
          className="min-h-[100svh]"
          heading={
            <>
              <p className="strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk">Plan a flight · {airports.toLocaleString('en-IN')} airports</p>
              <h2 className="font-display text-[40px] leading-[1.02] md:text-[60px]">
                Tell us the journey. <em>We will find the aircraft.</em>
              </h2>
            </>
          }
        />
      </section>

      <section aria-label="More ways to fly" className="mx-auto mt-28 grid max-w-[1320px] gap-6 px-5 md:grid-cols-3 md:px-12">
        {chapters.map((c, i) => (
          <Reveal key={c.href} index={i}>
            <Link href={c.href} className="group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-sm bg-night p-7 text-paper md:aspect-[4/5]">
              <SceneImage plate={scene(c.scene)} sizes="(min-width:768px) 32vw, 100vw" drift={false} settle={false} className="transition-transform duration-[1200ms] ease-[var(--ease-climb)] group-hover:scale-[1.04]" />
              <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night/90 via-night/30 to-transparent" />
              <p className="strip relative text-[11px] uppercase tracking-[0.22em] text-dusk">{c.eyebrow}</p>
              <h2 className="font-display relative mt-3 text-[34px] leading-[1.02]">{c.title}</h2>
              <p className="relative mt-3 max-w-xs text-[15px] leading-relaxed text-paper/80">{c.text}</p>
              <span className="relative mt-6 inline-flex items-center gap-2 text-[15px]">
                {c.cta} <span className="arrow" aria-hidden>→</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </section>

      <section className="relative isolate mt-28 overflow-hidden bg-night text-paper">
        <SceneImage plate={scene('cabin-warm')} sizes="100vw" settle={false} />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/85 to-night/30" />
        <div className="relative mx-auto grid max-w-[1320px] gap-14 px-5 py-28 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:px-12 md:py-36">
          <p className="reveal font-display text-[40px] leading-[1.04] md:text-[60px]">
            Every flight partner is checked <em>before it appears on ThePrivate.</em>
          </p>
          <ul className="flex flex-col justify-end gap-6 text-[17px] leading-relaxed text-paper/80">
            {[
              ['Clear prices.', 'Estimates are labelled as estimates. You pay the price in the offer you choose.'],
              ['Nothing by surprise.', 'Asking is free. Your flight is booked only when you choose and the partner confirms.'],
              ['Who flies you.', 'ThePrivate arranges the flight; the licensed air operator named in your offer operates it.'],
            ].map(([t, d], i) => (
              <Reveal as="li" key={t} index={i} className="border-t border-paper/15 pt-5">
                <strong className="font-medium text-paper">{t}</strong> {d}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 pt-28 md:px-12">
        <div className="reveal flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display max-w-3xl text-[40px] leading-[1.02] md:text-[60px]">
            Know where, <em>not which aircraft?</em>
          </h2>
          <LinkButton href="/charter/request" size="lg" arrow>Send a flight request</LinkButton>
        </div>
      </section>
    </>
  );
}
