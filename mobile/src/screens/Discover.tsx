import { Link } from 'react-router';
import type { DiscoverResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { Icon } from '@/components/Icon';
import { Plate, PLATES } from '@/components/Plate';
import { StatusChip } from '@/components/ui';
import { localDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { ListingCard, OneWayRow } from './Explore';

const HOW = [
  ['Tell us the journey', 'Route, date and passengers. That is all we need to begin.'],
  ['Compare real offers', 'Licensed flight partners reply with priced offers you can compare.'],
  ['Fly with confidence', 'Your partner operates the flight; ThePrivate keeps every detail in one place.'],
] as const;

/** Discover: the cinematic front door, then only real, live content. */
export function Discover() {
  const { state } = useAuth();
  const { data } = useApi<DiscoverResponse>(state.status === 'restoring' ? null : '/api/mobile/v1/discover');
  const next = data?.nextJourney ?? null;

  return (
    <div className="bg-night text-paper">
      <section className="relative isolate flex min-h-[86svh] flex-col justify-end overflow-hidden px-6" style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 40 }}>
        <Plate plate={PLATES.cabinWindow} priority className="animate-[drift_14s_var(--ease-approach)_both]" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night via-night/40 to-night/10" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-night/70 to-transparent" />

        <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6" style={{ paddingTop: 'calc(var(--safe-top) + 14px)' }}>
          <p className="font-display text-[22px] leading-none">
            <span className="italic">The</span>Private<span className="ml-0.5 align-super text-[10px] text-magenta">●</span>
          </p>
          <Link to={state.status === 'signed-in' ? '/inbox' : '/auth/sign-in?next=/inbox'} aria-label={data?.unread ? `Inbox, ${data.unread} unread` : 'Inbox'} className="relative grid size-11 place-items-center rounded-full bg-white/8 backdrop-blur-md">
            <Icon name="bell" className="size-5" />
            {!!data?.unread && <span aria-hidden className="absolute right-2.5 top-2.5 size-2 rounded-full bg-magenta" />}
          </Link>
        </header>

        <div className="relative animate-rise">
          <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">Private aviation</p>
          <h1 className="font-display text-[56px] leading-[0.95] tracking-[-0.01em]">
            Where <em>to?</em>
          </h1>
          <p className="mt-4 max-w-[30ch] text-[16px] leading-relaxed text-paper/75">Private flights arranged with licensed flight partners, from one request.</p>
          <Link to="/plan" className="mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-paper px-7 text-[15px] font-medium text-ink active:scale-[0.98]">
            Plan a flight <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>
      </section>

      {next && (
        <section className="px-6 pb-2 pt-8">
          <p className="strip mb-3 text-[11px] uppercase tracking-[0.22em] text-dusk">Your next journey</p>
          <Link to={next.booking ? `/journeys/booking/${next.booking.reference}` : `/journeys/request/${next.reference}`} className="block rounded-[22px] border border-night-line bg-night-2 p-5">
            <p className="strip text-[26px] leading-none">{next.legs[0]!.from.code} <span className="text-paper/45">→</span> {next.legs[0]!.to.code}</p>
            <p className="mt-2 text-[14px] text-paper/70">{localDate(next.legs[0]!.date)} · {next.passengers} passengers</p>
            <div className="mt-4 flex items-center gap-3">
              <StatusChip status={next.booking ? next.booking.status : next.status} />
              {!next.booking && next.openOffers > 0 && <span className="text-[13px] text-dusk">{next.openOffers} offers to review</span>}
            </div>
          </Link>
        </section>
      )}

      <div className="bg-paper text-ink">
        {data && data.oneWay.length > 0 && (
          <section className="px-6 pb-4 pt-10">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-[28px] leading-tight">Already flying <em>your way</em></h2>
              <Link to="/explore" className="text-[13.5px] font-medium text-sectional">All</Link>
            </div>
            <p className="text-[14px] text-ink-2">One-way offers on aircraft that are flying the route anyway.</p>
            <ul>{data.oneWay.slice(0, 4).map((l) => <OneWayRow key={l.id} l={l} />)}</ul>
          </section>
        )}
        {data && data.aircraft.length > 0 && (
          <section className="px-6 pb-4 pt-10">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-[28px] leading-tight">An aircraft <em>of your own</em></h2>
              <Link to="/explore?tab=aircraft" className="text-[13.5px] font-medium text-sectional">All</Link>
            </div>
            <ul>{data.aircraft.slice(0, 3).map((l) => <ListingCard key={l.id} l={l} />)}</ul>
          </section>
        )}

        <section className="px-6 pb-14 pt-12">
          <p className="strip mb-6 text-[11px] uppercase tracking-[0.22em] text-muted">How it works</p>
          <ol className="space-y-7">
            {HOW.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="strip pt-1 text-[12px] text-magenta">0{i + 1}</span>
                <div>
                  <h2 className="font-display text-[24px] leading-tight">{title}</h2>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-10 border-t border-line pt-5 text-[12.5px] leading-relaxed text-muted">ThePrivate arranges private flights. Every flight is operated by an independent, licensed air operator.</p>
        </section>
      </div>
    </div>
  );
}
