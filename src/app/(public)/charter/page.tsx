import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HeaderOver } from '@/components/cinematic/header-over';
import { Resolve, scene, SceneEmpty, SceneImage } from '@/components/cinematic/scene';
import type { AirportPick } from '@/components/domain/airport-combobox';
import { CharterSearch } from '@/components/domain/charter-search';
import { Journey, km } from '@/components/domain/journey';
import { RouteMap } from '@/components/motion/route-map';
import { categoryLabel, Status } from '@/components/domain/status';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, Notice } from '@/components/ui/display';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { prisma } from '@/server/db/client';
import { searchCharter, searchSchema } from '@/server/services/charter-search';

export const metadata: Metadata = {
  title: 'Plan a flight',
  description: 'Plan a private flight: tell us where and when, see suitable aircraft and request offers from checked flight partners.',
};
export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

function toPick(a: { id: string; icao: string | null; iata: string | null; name: string; city: string | null; countryCode: string; latitude: unknown; longitude: unknown } | null): AirportPick | null {
  return a ? { id: a.id, icao: a.icao, iata: a.iata, name: a.name, city: a.city, countryCode: a.countryCode, lat: Number(a.latitude), lon: Number(a.longitude) } : null;
}

export default async function CharterPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const hasQuery = Boolean(sp.from || sp.to || sp.date);
  const parsed = searchSchema.safeParse(sp);
  const [fromA, toA] = await Promise.all([sp.from ? prisma.airport.findUnique({ where: { id: sp.from } }) : null, sp.to ? prisma.airport.findUnique({ where: { id: sp.to } }) : null]);
  const result = parsed.success ? await searchCharter(parsed.data) : null;
  const requestHref = `/charter/request?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`;
  const initial = { from: toPick(fromA), to: toPick(toA), date: sp.date, returnDate: sp.returnDate, pax: sp.pax ? Number(sp.pax) : undefined, category: sp.category };

  // Approved photography only (read-only lookup; the search service itself is unchanged).
  const photos = result?.ok && result.results.length
    ? new Map(
        (await prisma.aircraft.findMany({ where: { id: { in: result.results.map((r) => r.aircraftId) } }, select: { id: true, images: { where: { isApproved: true }, take: 1, orderBy: { sortOrder: 'asc' }, select: { documentId: true, alt: true } } } }))
          .filter((a) => a.images[0])
          .map((a) => [a.id, a.images[0]!]),
      )
    : new Map<string, { documentId: string; alt: string }>();

  if (!result?.ok) {
    // The planner: night over the cloud deck, every airport a light, the route drawn as you choose.
    return (
      <>
        <CharterSearch
          initial={initial}
          className="-mt-16 min-h-[100svh]"
          backdrop={
            <>
              <SceneImage plate={scene('sky-descent')} priority />
              <div aria-hidden className="absolute inset-0 bg-night/80" />
              <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night via-night/30 to-night/60" />
            </>
          }
          heading={
            <>
              {hasQuery && !parsed.success && (
                <div className="mb-6 text-ink">
                  <Notice tone="warning" title="Almost there">
                    {parsed.error.issues.map((i) => i.message).filter((m, i, a) => a.indexOf(m) === i).join(' · ')}
                  </Notice>
                </div>
              )}
              {result && !result.ok && (
                <div className="mb-6 text-ink">
                  <Notice tone="warning">{result.error}</Notice>
                </div>
              )}
              <p className="resolve-late strip mb-5 text-[11px] uppercase tracking-[0.22em] text-dusk">Plan a flight</p>
              <h1 className="font-display text-[44px] leading-[0.98] sm:text-[56px] md:text-[76px]">
                <Resolve text="Where would you" />
                <br />
                <Resolve text="like to go?" className="italic" offset={3} />
              </h1>
            </>
          }
        />

        <section className="mx-auto max-w-[1320px] px-5 py-24 md:px-12">
          <ol className="grid gap-12 md:grid-cols-3">
            {[
              ['Tell us the journey', 'Where, when and how many of you. That is all we need to begin.'],
              ['Compare offers', 'Flight partners reply with the aircraft, the price and what is included.'],
              ['Choose, then fly', 'Pick the offer you prefer. Nothing is booked until you do.'],
            ].map(([t, d], i) => (
              <Reveal as="li" index={i} key={t} className="border-t border-ink pt-6">
                <span className="strip text-[12px] text-magenta">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="font-display mt-4 text-[30px] leading-tight">{t}</h2>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">{d}</p>
              </Reveal>
            ))}
          </ol>
        </section>
      </>
    );
  }

  const { from, to, results, distanceNm, blocked } = result;
  const pax = sp.pax ? Number(sp.pax) : null;
  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden bg-night text-paper">
        <HeaderOver />
        <div aria-hidden className="absolute inset-0">
          <RouteMap
            from={{ lat: Number(from.latitude), lon: Number(from.longitude), code: from.iata ?? from.icao ?? '', city: from.city ?? from.name }}
            to={{ lat: Number(to.latitude), lon: Number(to.longitude), code: to.iata ?? to.icao ?? '', city: to.city ?? to.name }}
            inset={{ top: 0.14, bottom: 0.5 }}
            labels={false}
          />
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-night via-night/70 to-transparent" />
        <div className="relative mx-auto max-w-[1320px] px-5 pb-12 pt-[42svh] md:px-12 md:pb-16">
          <p className="resolve-late strip mb-6 text-[11px] uppercase tracking-[0.22em] text-dusk">Your journey</p>
          <Journey from={from} to={to} size="lg" tone="dark" />
          <p className="resolve-late mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-paper/80">
            {sp.date && <span>{formatDate(new Date(sp.date), { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
            {sp.returnDate && <span>Return {formatDate(new Date(sp.returnDate), { day: 'numeric', month: 'long' })}</span>}
            {pax && <span>{pax} {pax === 1 ? 'passenger' : 'passengers'}</span>}
            <span>{km(distanceNm)} direct</span>
          </p>
          <details className="group mt-8">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-paper/35 bg-paper/10 px-5 py-2 text-sm backdrop-blur-md transition-colors hover:bg-paper/20 [&::-webkit-details-marker]:hidden">
              Change journey <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-6 max-w-[1040px] [animation:rise_var(--dur-3)_var(--ease-climb)_both]">
              <CharterSearch variant="glass" compact initial={initial} />
            </div>
          </details>
        </div>
      </section>

      <section aria-labelledby="results" className="mx-auto max-w-[1320px] px-5 pt-16 md:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-5">
          <div>
            <p className="strip mb-3 text-[11px] uppercase tracking-[0.22em] text-magenta">Aircraft for this journey</p>
            <h2 id="results" className="font-display text-[36px] leading-none md:text-[52px]">
              {results.length === 0 ? 'No aircraft listed for this journey yet' : `${results.length} aircraft for your journey`}
            </h2>
          </div>
          {results.length > 0 && <LinkButton href={requestHref} variant="secondary">Request offers for any aircraft</LinkButton>}
        </div>

        {results.length === 0 ? (
          <SceneEmpty scene="cabin-aisle" eyebrow="Your journey" title="We will find one for you" action={<LinkButton href={requestHref} variant="light" size="lg" arrow>Send a flight request</LinkButton>}>
            Send us the journey and we will ask suitable flight partners for offers. Free, and nothing is booked until you choose.
          </SceneEmpty>
        ) : (
          <ul className="flex flex-col gap-6">
            {results.map((r, i) => {
              const photo = photos.get(r.aircraftId);
              return (
                <Reveal as="li" index={i} key={r.aircraftId} className="group grid overflow-hidden rounded-sm bg-paper-2/60 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-night md:aspect-auto md:min-h-[300px]">
                    {photo ? (
                      <Image src={`/api/files/${photo.documentId}`} alt={photo.alt} fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover transition-transform duration-[var(--dur-4)] ease-[var(--ease-climb)] group-hover:scale-[1.03]" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex flex-col justify-between p-7 text-paper">
                        <div aria-hidden className="chart-graticule absolute inset-0 opacity-25 [filter:invert(1)]" />
                        <span className="strip relative text-[11px] uppercase tracking-[0.2em] text-dusk">{categoryLabel(r.category)}</span>
                        <span className="relative">
                          <span className="font-display block text-[72px] leading-none">{r.seats}</span>
                          <span className="mt-1 block text-[15px] text-paper/70">seats · {r.typeLabel}</span>
                        </span>
                        <span className="relative text-[12px] text-paper/45">Photos not yet provided by the flight partner</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-6 p-7 md:p-9">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="strip text-[11px] uppercase tracking-[0.2em] text-muted">{String(i + 1).padStart(2, '0')} · {categoryLabel(r.category)}</p>
                        <h3 className="font-display mt-2 text-[32px] leading-none md:text-[40px]">{r.typeLabel}</h3>
                      </div>
                      <Status kind="availability" value={r.availability} audience="customer" />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[15px] sm:grid-cols-3">
                      <div><dt className="text-[13px] text-muted">Seats</dt><dd className="mt-0.5">{r.seats}</dd></div>
                      <div><dt className="text-[13px] text-muted">Based at</dt><dd className="mt-0.5">{r.homeBase ?? 'Not stated'}</dd></div>
                      <div>
                        <dt className="text-[13px] text-muted">Range</dt>
                        <dd className="mt-0.5">{r.rangeNote === 'OK' ? 'Flies this route direct' : r.rangeNote === 'MAY_NEED_STOP' ? 'May need a fuel stop' : 'To be confirmed'}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6">
                      <div>
                        {r.indicative ? (
                          <>
                            <p className="text-[13px] text-muted">Estimate · one way · not an offer</p>
                            <p className="strip mt-1 text-[22px]">{formatMoney(r.indicative.low, r.indicative.currency)} – {formatMoney(r.indicative.high, r.indicative.currency)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[13px] text-muted">Price</p>
                            <p className="mt-1 text-[17px]">Price on request</p>
                          </>
                        )}
                        <p className="mt-3 text-[13px] text-muted">
                          Operated by {r.operator.isPubliclyListed ? <Link href={`/operators/${r.operator.slug}`} className="link-draw text-ink-2">{r.operator.name}</Link> : r.operator.name} · <span className="strip">{r.registration}</span>
                        </p>
                      </div>
                      <LinkButton href={`${requestHref}&aircraft=${r.aircraftId}`} arrow>Request this aircraft</LinkButton>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
        {blocked > 0 && <p className="mt-6 text-sm text-muted">{blocked} more {blocked === 1 ? 'aircraft is' : 'aircraft are'} unavailable on this date.</p>}
        <p className="mt-10 max-w-2xl text-[13px] leading-relaxed text-muted">
          Every aircraft here belongs to a flight partner checked by ThePrivate. Estimates are guides only: the price you pay is the one in the offer you choose.
        </p>
      </section>
    </>
  );
}
