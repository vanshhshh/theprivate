import { notFound } from 'next/navigation';
import { Itinerary, routeSummary } from '@/components/domain/itinerary';
import { Journey } from '@/components/domain/journey';
import { NEXT_STEP } from '@/components/domain/journey-copy';
import { Status, statusLabel } from '@/components/domain/status';
import { RouteMap } from '@/components/motion/route-map';

import { DL, Notice, SectionTitle } from '@/components/ui/display';
import { InlineAction } from '@/components/ui/inline-action';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { getCustomerBooking } from '@/server/services/bookings';
import { cancelBookingAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function BookingPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ new?: string }> }) {
  const { ref } = await params;
  const { new: isNew } = await searchParams;
  const v = await requireViewerPage(`/account/bookings/${ref}`);
  const b = await getCustomerBooking(v.user.id, ref);
  if (!b) notFound();
  const type = b.aircraft.aircraftType ? `${b.aircraft.aircraftType.manufacturer} ${b.aircraft.aircraftType.model}` : b.aircraft.modelRaw;
  const first = b.legs[0];
  const last = b.legs.at(-1);
  const paid = b.payments.some((p) => p.status === 'SETTLED');
  return (
    <>
      <header className="relative isolate mb-12 overflow-hidden rounded-sm bg-night p-8 text-paper md:p-12">
        {first && last && (
          <div aria-hidden className="absolute inset-0">
            <RouteMap from={{ lat: Number(first.fromAirport.latitude), lon: Number(first.fromAirport.longitude), code: first.fromAirport.iata ?? first.fromAirport.icao ?? '' }} to={{ lat: Number(last.toAirport.latitude), lon: Number(last.toAirport.longitude), code: last.toAirport.iata ?? last.toAirport.icao ?? '' }} inset={{ top: 0.16, bottom: 0.56 }} labels={false} />
          </div>
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-night via-night/85 to-transparent" />
        <div className="relative">
          <div className="mb-[180px] flex flex-wrap items-center justify-between gap-4 md:mb-[220px]">
            <p className="strip text-[11px] uppercase tracking-[0.22em] text-dusk">Your trip · {b.reference}</p>
            <Status kind="booking" value={b.status} audience="customer" />
          </div>
          {first && last && <Journey from={first.fromAirport} to={last.toAirport} size="lg" tone="dark" />}
          <p className="strip mt-8 text-[13px] text-paper/55">{routeSummary(b.legs)}</p>
          <div className="mt-8 grid gap-6 border-t border-paper/15 pt-6 sm:grid-cols-3">
            <div><p className="text-[13px] text-paper/55">Departs</p><p className="mt-1 text-[17px]">{first ? formatDate(first.departureDate, { weekday: 'short', day: 'numeric', month: 'long' }) : '—'}{first?.departureTimeLocal ? ` · ${first.departureTimeLocal}` : ''}</p></div>
            <div><p className="text-[13px] text-paper/55">Aircraft</p><p className="mt-1 text-[17px]">{type}</p></div>
            <div><p className="text-[13px] text-paper/55">Total</p><p className="strip mt-1 text-[17px]">{formatMoney(b.customerTotal.toString(), b.currency)}</p></div>
          </div>
        </div>
      </header>

      {isNew && <div className="mb-8"><Notice tone="success" title="Offer chosen">Your booking request was sent to {b.operator.displayName}. It becomes a confirmed booking once they confirm.</Notice></div>}
      <div className="mb-14"><Notice tone={b.status === 'CANCELLED' ? 'danger' : 'info'} title="What happens next">{NEXT_STEP[b.status]}</Notice></div>

      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle>Flights</SectionTitle>
          <Itinerary legs={b.legs} />
          <div className="mt-14">
            <SectionTitle>Updates</SectionTitle>
            <ol className="relative ml-1.5 border-l border-line">
              {b.events.map((e) => (
                <li key={e.id} className="mb-6 ml-6">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-magenta" aria-hidden />
                  <p className="font-medium">{statusLabel('booking', e.toStatus, 'customer')}</p>
                  <p className="text-[14px] text-muted">{formatDateTime(e.createdAt, v.user.timezone)}{e.note ? ` · ${e.note}` : ''}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <aside className="flex flex-col gap-10">
          <div className="rounded-sm bg-paper-2/70 p-7">
            <SectionTitle>Summary</SectionTitle>
            <DL items={[
              ['Operated by', b.operator.displayName],
              ['Aircraft', <span key="a">{type} · <span className="strip">{b.aircraft.registration}</span></span>],
              ['Total', <span key="t" className="strip">{formatMoney(b.customerTotal.toString(), b.currency)}{Number(b.quoteRevision.taxes) > 0 ? ' incl. taxes' : ' excl. taxes'}</span>],
              ['Payment', paid ? 'Settled' : 'Not paid'],
              ['Offer version', b.quoteRevision.revision],
            ]} />
            {b.quoteRevision.inclusions.length > 0 && <p className="mt-5 text-[14px] text-ink-2"><span className="text-muted">Included:</span> {b.quoteRevision.inclusions.join(' · ')}</p>}
          </div>
          {['PENDING_OPERATOR_CONFIRMATION', 'CONFIRMED', 'PAYMENT_PENDING'].includes(b.status) && (
            <InlineAction action={cancelBookingAction} hidden={{ reference: b.reference }} label="Cancel booking" variant="danger" reason={{ label: 'Why are you cancelling?', required: true }} />
          )}
        </aside>
      </div>
    </>
  );
}
