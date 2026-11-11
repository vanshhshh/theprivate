import { Link } from 'react-router';
import type { RequestSummary } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { Icon } from '@/components/Icon';
import { PLATES } from '@/components/Plate';
import { ScreenHero } from '@/components/ScreenHero';
import { EmptyState, ErrorState, LinkButton, Section, Skeleton, StatusChip } from '@/components/ui';
import { localDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const UPCOMING = ['PENDING_OPERATOR_CONFIRMATION', 'CONFIRMED', 'PAYMENT_PENDING', 'PAID', 'IN_PROGRESS'];
const PAST_BOOKING = ['COMPLETED', 'CANCELLED'];
const CLOSED_REQUEST = ['EXPIRED', 'CANCELLED'];

function group(rows: RequestSummary[]) {
  const upcoming: RequestSummary[] = [];
  const open: RequestSummary[] = [];
  const past: RequestSummary[] = [];
  for (const r of rows) {
    if (r.booking && UPCOMING.includes(r.booking.status.value)) upcoming.push(r);
    else if ((r.booking && PAST_BOOKING.includes(r.booking.status.value)) || CLOSED_REQUEST.includes(r.status.value)) past.push(r);
    else open.push(r);
  }
  return { upcoming, open, past };
}

export function JourneyRow({ r }: { r: RequestSummary }) {
  const first = r.legs[0]!;
  const last = r.legs[r.legs.length - 1]!;
  const to = r.booking ? `/journeys/booking/${r.booking.reference}` : `/journeys/request/${r.reference}`;
  return (
    <li>
      <Link to={to} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-5">
        <div className="min-w-0">
          <p className="strip text-[20px] leading-none">
            {first.from.code} <span className="text-muted">{r.tripType === 'RETURN' ? '⇄' : '→'}</span> {r.tripType === 'RETURN' ? first.to.code : last.to.code}
          </p>
          <p className="mt-2 truncate text-[13.5px] text-ink-2">
            {localDate(first.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {r.passengers} pax · {r.booking ? r.booking.reference : r.reference}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusChip status={r.booking ? r.booking.status : r.status} />
            {!r.booking && r.openOffers > 0 && <span className="text-[12.5px] font-medium text-magenta">{r.openOffers} {r.openOffers === 1 ? 'offer' : 'offers'} to review</span>}
          </div>
        </div>
        <Icon name="chevron-right" className="size-5 text-muted" />
      </Link>
    </li>
  );
}

/** Every request, offer and trip in one place, grouped by where it stands. */
export function Journeys() {
  const { state } = useAuth();
  const signedIn = state.status === 'signed-in';
  const { data, error, loading, reload } = useApi<RequestSummary[]>(signedIn ? '/api/mobile/v1/requests' : null);
  const g = data ? group(data) : null;

  return (
    <>
      <ScreenHero plate={PLATES.cabinWarm} eyebrow="My journeys" title={<>Every trip, <em>in one place.</em></>}>
        {signedIn && (
          <Link to="/inbox" className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-[13.5px] backdrop-blur-md">
            <Icon name="bell" className="size-4" /> Inbox
          </Link>
        )}
      </ScreenHero>
      {state.status === 'restoring' && <Skeleton />}
      {state.status === 'signed-out' && (
        <EmptyState title="Your journeys live here" action={<LinkButton to="/auth/sign-in?next=/journeys">Sign in</LinkButton>}>
          Sign in to see your flight requests, the offers you receive and your confirmed trips.
        </EmptyState>
      )}
      {signedIn && loading && !data && <Skeleton />}
      {signedIn && error && <ErrorState error={error} onRetry={reload} />}
      {g && data!.length === 0 && (
        <EmptyState title="No journeys yet" action={<LinkButton to="/plan">Plan a flight</LinkButton>}>
          Tell us where you’d like to go. Licensed partners reply with offers you can compare.
        </EmptyState>
      )}
      {g && g.upcoming.length > 0 && (
        <Section title="Upcoming">
          <ul>{g.upcoming.map((r) => <JourneyRow key={r.reference} r={r} />)}</ul>
        </Section>
      )}
      {g && g.open.length > 0 && (
        <Section title="Requests & offers">
          <ul>{g.open.map((r) => <JourneyRow key={r.reference} r={r} />)}</ul>
        </Section>
      )}
      {g && g.past.length > 0 && (
        <Section title="Past">
          <ul className="opacity-80">{g.past.map((r) => <JourneyRow key={r.reference} r={r} />)}</ul>
        </Section>
      )}
    </>
  );
}
