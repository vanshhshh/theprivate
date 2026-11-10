import Link from 'next/link';
import { scene, SceneImage } from '@/components/cinematic/scene';
import { SignOutButton } from '@/components/domain/auth-forms';
import { routeSummary } from '@/components/domain/itinerary';
import { Journey } from '@/components/domain/journey';
import { NEXT_STEP } from '@/components/domain/journey-copy';
import { Status } from '@/components/domain/status';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/display';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';

export const metadata = { title: 'Your journeys' };

const legs = { orderBy: { sequence: 'asc' as const }, include: { fromAirport: true, toAirport: true } };

export default async function AccountHome() {
  const v = await requireViewerPage('/account');
  const [bookings, openRfqs, unread, enquiries] = await Promise.all([
    prisma.booking.findMany({ where: { customerId: v.user.id, status: { notIn: ['CANCELLED', 'COMPLETED'] } }, include: { legs, operator: { select: { displayName: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.rfq.findMany({ where: { customerId: v.user.id, status: { in: ['SUBMITTED', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'] } }, include: { legs, _count: { select: { quotes: { where: { status: { in: ['SUBMITTED', 'REVISED'] } } } } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.notification.findMany({ where: { userId: v.user.id, readAt: null }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.emptyLegEnquiry.findMany({ where: { userId: v.user.id }, include: { listing: { include: { fromAirport: true, toAirport: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  // The next journey: the active booking whose first flight departs soonest.
  const byDeparture = [...bookings].sort((a, b) => (a.legs[0]?.departureDate.getTime() ?? Infinity) - (b.legs[0]?.departureDate.getTime() ?? Infinity));
  const next = byDeparture[0];
  const others = byDeparture.slice(1);
  const firstName = v.user.name.split(' ')[0];
  const quiet = bookings.length === 0 && openRfqs.length === 0;

  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-magenta">Your journeys</p>
          <h1 className="font-display text-[44px] leading-none md:text-[64px]">Hello, {firstName}</h1>
        </div>
        <div className="flex items-center gap-6">
          <LinkButton href="/charter" arrow>Plan a flight</LinkButton>
          <SignOutButton className="text-sm text-muted hover:text-ink" />
        </div>
      </header>

      {quiet ? (
        <Reveal>
          <Link href="/charter" className="group relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-sm bg-night p-8 text-paper md:p-12">
            <SceneImage plate={scene('cabin-aisle')} sizes="(min-width:1024px) 70vw, 100vw" drift={false} settle={false} className="transition-transform duration-[1200ms] ease-[var(--ease-climb)] group-hover:scale-[1.03]" />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night/90 via-night/40 to-transparent" />
            <p className="strip relative text-[11px] uppercase tracking-[0.22em] text-dusk">Nothing planned yet</p>
            <p className="font-display relative mt-3 max-w-xl text-[40px] leading-[1.02] md:text-[56px]">Your first journey starts with <em>a destination.</em></p>
            <span className="relative mt-8 inline-flex items-center gap-2 text-[15px]">Plan a flight <span className="arrow" aria-hidden>→</span></span>
          </Link>
        </Reveal>
      ) : (
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-16">
            {next && (
              <section aria-labelledby="next-journey">
                <h2 id="next-journey" className="sr-only">Your next journey</h2>
                <Reveal>
                  <Link href={`/account/bookings/${next.reference}`} className="group relative isolate block overflow-hidden rounded-sm bg-night p-8 text-paper md:p-10">
                    <div aria-hidden className="absolute inset-0 opacity-40"><SceneImage plate={scene('sky-descent')} sizes="60vw" drift={false} settle={false} /></div>
                    <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/80 to-night/40" />
                    <div className="relative">
                      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                        <p className="strip text-[11px] uppercase tracking-[0.22em] text-dusk">Your next journey</p>
                        <Status kind="booking" value={next.status} audience="customer" />
                      </div>
                      {next.legs[0] && <Journey from={next.legs[0].fromAirport} to={next.legs.at(-1)!.toAirport} size="lg" tone="dark" />}
                      <p className="strip mt-8 text-[13px] text-paper/60">{routeSummary(next.legs)}</p>
                      <p className="mt-2 text-[17px]">{next.legs[0] && formatDate(next.legs[0].departureDate, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatMoney(next.customerTotal.toString(), next.currency)}</p>
                      <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-paper/75">{NEXT_STEP[next.status]}</p>
                      <span className="mt-8 inline-flex items-center gap-2 text-[15px]">View itinerary <span className="arrow" aria-hidden>→</span></span>
                    </div>
                  </Link>
                </Reveal>
              </section>
            )}

            {others.length > 0 && (
              <section>
                <SectionTitle>Also booked</SectionTitle>
                <ul className="flex flex-col">
                  {others.map((b) => (
                    <li key={b.id} className="border-b border-line">
                      <Link href={`/account/bookings/${b.reference}`} className="group flex flex-wrap items-center justify-between gap-4 py-5">
                        <span>
                          <span className="strip text-[17px]">{routeSummary(b.legs)}</span>
                          <span className="mt-1 block text-[14px] text-muted">{b.legs[0] && formatDate(b.legs[0].departureDate)} · operated by {b.operator.displayName}</span>
                        </span>
                        <Status kind="booking" value={b.status} audience="customer" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <SectionTitle aside={<Link href="/account/trips" className="link-draw hover:text-ink">All trips & requests</Link>}>Flight requests</SectionTitle>
              {openRfqs.length === 0 ? (
                <p className="py-4 text-[15px] text-muted">No open requests. <Link href="/charter" className="link-draw text-ink">Plan a flight</Link></p>
              ) : (
                <ul className="flex flex-col">
                  {openRfqs.map((r) => (
                    <li key={r.id} className="border-b border-line">
                      <Link href={`/account/trips/${r.reference}`} className="group grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <span>
                          <span className="strip text-[17px]">{routeSummary(r.legs)}</span>
                          <span className="mt-1 block text-[14px] text-muted">{r.legs[0] && formatDate(r.legs[0].departureDate)} · {r.passengers} {r.passengers === 1 ? 'passenger' : 'passengers'}</span>
                        </span>
                        <span className="flex items-center gap-4">
                          {r._count.quotes > 0 && <span className="text-[14px] font-medium text-magenta">{r._count.quotes} {r._count.quotes === 1 ? 'offer' : 'offers'} to compare</span>}
                          <Status kind="rfq" value={r.status} audience="customer" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {enquiries.length > 0 && (
              <section>
                <SectionTitle>One-way offer enquiries</SectionTitle>
                <ul className="flex flex-col text-[15px]">
                  {enquiries.map((e) => (
                    <li key={e.id} className="flex justify-between border-b border-line py-4">
                      <span className="strip">{e.listing.fromAirport.iata ?? e.listing.fromAirport.icao} → {e.listing.toAirport.iata ?? e.listing.toAirport.icao}</span>
                      <span className="text-muted">{e.passengers} {e.passengers === 1 ? 'passenger' : 'passengers'} · {e.status.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside>
            <SectionTitle aside={<Link href="/account/notifications" className="link-draw hover:text-ink">Inbox</Link>}>Messages</SectionTitle>
            {unread.length === 0 ? (
              <p className="py-4 text-[15px] text-muted">You are all caught up.</p>
            ) : (
              <ul className="flex flex-col">
                {unread.map((n) => (
                  <li key={n.id} className="border-b border-line py-4">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-[14px] text-muted">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
