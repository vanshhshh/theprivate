import { scene } from '@/components/cinematic/scene';
import { SceneSequence, type SequenceScene } from '@/components/cinematic/scene-sequence';
import { FlightFilm } from '@/components/cinematic/flight-film';
import { CharterSearch } from '@/components/domain/charter-search';
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

  const sequence: SequenceScene[] = [
    {
      plate: scene('jet-inflight'),
      eyebrow: liveEmptyLegs ? `${liveEmptyLegs} one-way ${liveEmptyLegs === 1 ? 'offer' : 'offers'} live` : 'One-way offers',
      title: <>Already flying <em>your way.</em></>,
      text: 'Seats on private flights that are going anyway, offered by checked flight partners.',
      href: '/empty-legs',
      cta: 'Discover one-way offers',
      caption: 'Illustrative aircraft, not a listing.',
      side: 'left',
    },
    {
      plate: scene('jets-ramp'),
      eyebrow: liveListings ? `${liveListings} ${liveListings === 1 ? 'aircraft' : 'aircraft'} for sale` : 'Aircraft for sale',
      title: <>An aircraft <em>of your own.</em></>,
      text: 'Business jets, turboprops and helicopters. Every listing is reviewed before it appears.',
      href: '/aircraft-for-sale',
      cta: 'Browse aircraft',
      caption: 'Illustrative aircraft, not a listing.',
      side: 'right',
    },
    {
      plate: scene('cabin-warm'),
      eyebrow: activeOperators ? `${activeOperators} flight ${activeOperators === 1 ? 'partner' : 'partners'}` : 'How we work',
      title: <>A more considered <em>way to fly.</em></>,
      text: <>Every flight partner is checked before it appears. Prices are clear, and nothing is booked until you choose. We arrange the flight; the licensed operator named in your offer flies it.</>,
      href: '/charter',
      cta: 'Plan a flight',
      side: 'left',
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

      <SceneSequence label="Ways to fly with ThePrivate" scenes={sequence} />

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
