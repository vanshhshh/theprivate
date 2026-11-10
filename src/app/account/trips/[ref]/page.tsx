import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Itinerary } from '@/components/domain/itinerary';
import { Journey } from '@/components/domain/journey';
import { categoryLabel, Status } from '@/components/domain/status';
import { RouteMap } from '@/components/motion/route-map';

import { FlapText, Reveal } from '@/components/motion/motion';
import { Notice, Pill, SectionTitle } from '@/components/ui/display';
import { SceneEmpty } from '@/components/cinematic/scene';
import { InlineAction } from '@/components/ui/inline-action';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { getCustomerRfq } from '@/server/services/rfq';
import { acceptQuoteAction, cancelRfqAction, declineQuoteAction } from '../../actions';

export const dynamic = 'force-dynamic';

const TRIP: Record<string, string> = { ONE_WAY: 'One way', RETURN: 'Return', MULTI_LEG: 'Several stops' };

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border-line py-4', className)}>
      <p className="text-[13px] text-muted">{label}</p>
      <div className="mt-1 text-[15px]">{children}</div>
    </div>
  );
}

export default async function TripPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ new?: string }> }) {
  const { ref } = await params;
  const { new: isNew } = await searchParams;
  const v = await requireViewerPage(`/account/trips/${ref}`);
  const rfq = await getCustomerRfq(v.user.id, ref);
  if (!rfq) notFound();
  const now = new Date();
  const open = rfq.quotes.filter((q) => ['SUBMITTED', 'REVISED'].includes(q.status) && q.validUntil > now);
  const closed = rfq.quotes.filter((q) => !open.includes(q));
  const cheapest = open.length ? Math.min(...open.map((q) => Number(q.customerPrice))) : null;
  const canAccept = rfq.status === 'QUOTES_AVAILABLE';
  const waiting = ['MATCHING', 'AWAITING_QUOTES'].includes(rfq.status);
  const first = rfq.legs[0];
  const last = rfq.legs.at(-1);

  return (
    <>
      <header className="relative isolate mb-14 overflow-hidden rounded-sm bg-night p-8 text-paper md:p-12">
        {first && last && (
          <div aria-hidden className="absolute inset-0">
            <RouteMap from={{ lat: Number(first.fromAirport.latitude), lon: Number(first.fromAirport.longitude), code: first.fromAirport.iata ?? first.fromAirport.icao ?? '' }} to={{ lat: Number(last.toAirport.latitude), lon: Number(last.toAirport.longitude), code: last.toAirport.iata ?? last.toAirport.icao ?? '' }} inset={{ top: 0.16, bottom: 0.5 }} labels={false} />
          </div>
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-night via-night/85 to-transparent" />
        <div className="relative mb-[160px] flex flex-wrap items-center justify-between gap-4 md:mb-[200px]">
          <p className="strip text-[11px] uppercase tracking-[0.22em] text-dusk">Flight request · {rfq.reference}</p>
          <Status kind="rfq" value={rfq.status} audience="customer" />
        </div>
        {first && last && <Journey from={first.fromAirport} to={last.toAirport} size="lg" tone="dark" className="relative" />}
        <p className="relative mt-6 text-[17px] text-paper/75">
          {TRIP[rfq.tripType] ?? rfq.tripType} · {rfq.passengers} {rfq.passengers === 1 ? 'passenger' : 'passengers'}
          {rfq.categoryPreference ? ` · prefers a ${categoryLabel(rfq.categoryPreference).toLowerCase()}` : ''}
        </p>
      </header>

      {isNew && (
        <div className="mb-10">
          <Notice tone="success" title="Request sent">
            {rfq._count.recipients > 0
              ? `Sent to ${rfq._count.recipients} flight ${rfq._count.recipients > 1 ? 'partners' : 'partner'} with a suitable aircraft. We will let you know as offers arrive.`
              : 'No flight partner has a suitable aircraft listed yet. Our team has been alerted and will find options for you, or contact you.'}{' '}
            This is a request, not a booking.
          </Notice>
        </div>
      )}
      {rfq.booking && (
        <div className="mb-10">
          <Notice tone="info" title="You chose an offer">
            See your trip <Link className="strip underline" href={`/account/bookings/${rfq.booking.reference}`}>{rfq.booking.reference}</Link>.
          </Notice>
        </div>
      )}

      <section aria-labelledby="offers">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
          <h2 id="offers" className="font-display text-[36px] leading-none md:text-[48px]">{open.length > 1 ? 'Compare your offers' : 'Your offers'}</h2>
          {open.length > 0 && <p className="text-[14px] text-muted">{open.length} open · prices include ThePrivate&apos;s fee</p>}
        </div>
        {open.length === 0 ? (
          <SceneEmpty scene="window-light" eyebrow={waiting ? 'Your offers' : undefined} title={waiting ? <>Offers are <em>on their way.</em></> : 'No open offers'} className="min-h-[380px] md:min-h-[420px]">
            {waiting ? 'Flight partners usually reply within a few hours. We will let you know the moment one arrives.' : 'There are no offers you can choose on this request.'}
          </SceneEmpty>
        ) : (
          <ul className={cn('grid gap-6', open.length > 1 && 'md:grid-cols-2', open.length > 2 && 'xl:grid-cols-3')}>
            {open.map((q, i) => {
              const lowest = cheapest !== null && Number(q.customerPrice) === cheapest && open.length > 1;
              return (
                <Reveal as="li" index={i} key={q.id} className={cn('flex flex-col rounded-sm bg-paper-2/70 p-7', lowest && 'ring-1 ring-magenta/40')}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="strip text-[11px] uppercase tracking-[0.2em] text-muted">Offer {String(i + 1).padStart(2, '0')}</p>
                    {lowest && <Pill tone="info">Lowest price</Pill>}
                  </div>
                  <p className="font-display mt-3 text-[30px] leading-[1.05]">{q.aircraft.aircraftType ? `${q.aircraft.aircraftType.manufacturer} ${q.aircraft.aircraftType.model}` : q.aircraft.modelRaw}</p>

                  <div className="mt-6">
                    <p className="text-[13px] text-muted">Total{Number(q.taxes) > 0 ? ', including taxes' : ', taxes not included'}</p>
                    <FlapText value={formatMoney(q.customerPrice, q.currency)} className="mt-1 text-[34px]" />
                  </div>

                  <Row label="Aircraft">
                    {q.aircraft.seats} seats{q.aircraft.yearOfManufacture ? ` · built ${q.aircraft.yearOfManufacture}` : ''} · <span className="strip text-[13px]">{q.aircraft.registration}</span>
                  </Row>
                  <Row label="Included">{q.inclusions.length ? q.inclusions.join(' · ') : <span className="text-muted">Not specified</span>}</Row>
                  <Row label="Not included">{q.exclusions.length ? q.exclusions.join(' · ') : <span className="text-muted">Nothing listed</span>}</Row>
                  {q.terms && (
                    <Row label="Conditions">
                      <details>
                        <summary className="cursor-pointer text-sectional">Read the conditions</summary>
                        <p className="mt-2 whitespace-pre-line text-ink-2">{q.terms}</p>
                      </details>
                    </Row>
                  )}
                  <Row label="Valid until">{formatDateTime(q.validUntil, v.user.timezone)}{q.revision > 1 ? ' · updated offer' : ''}</Row>
                  <Row label="Operated by">{q.operator.isPubliclyListed ? <Link className="link-draw" href={`/operators/${q.operator.slug}`}>{q.operator.displayName}</Link> : q.operator.displayName}</Row>

                  {canAccept && (
                    <div className="mt-auto flex flex-col gap-3 pt-6">
                      <InlineAction action={acceptQuoteAction} hidden={{ quoteId: q.id, revision: q.revision, confirm: 'yes' }} label="Choose this offer" variant="primary" confirm={`Choosing this offer sends a booking request for ${formatMoney(q.customerPrice, q.currency)}. The flight partner then confirms, and payment is arranged afterwards. Your other offers will be declined.`} />
                      <InlineAction action={declineQuoteAction} hidden={{ quoteId: q.id }} label="Decline" variant="ghost" confirm="Decline this offer?" />
                    </div>
                  )}
                </Reveal>
              );
            })}
          </ul>
        )}
        {closed.length > 0 && (
          <details className="mt-8 text-[15px]">
            <summary className="cursor-pointer text-muted">{closed.length} closed {closed.length > 1 ? 'offers' : 'offer'}</summary>
            <ul className="mt-3">
              {closed.map((q) => (
                <li key={q.id} className="flex flex-wrap justify-between gap-3 border-b border-line py-3">
                  <span>{q.operator.displayName} · <span className="strip">{q.aircraft.registration}</span> · {formatMoney(q.customerPrice, q.currency)}</span>
                  <Status kind="quote" audience="customer" value={q.validUntil <= now && ['SUBMITTED', 'REVISED'].includes(q.status) ? 'EXPIRED' : q.status} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <div className="mt-20 grid gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section>
          <SectionTitle>Itinerary</SectionTitle>
          <Itinerary legs={rfq.legs} />
        </section>
        <aside className="flex flex-col gap-8 text-[15px]">
          <div>
            <SectionTitle>Details</SectionTitle>
            <p className="text-[13px] text-muted">Lead passenger</p>
            <p>{rfq.contactName}{rfq.contactPhone ? ` · ${rfq.contactPhone}` : ''}</p>
            {rfq.requirements && (<><p className="mt-4 text-[13px] text-muted">Your notes</p><p className="whitespace-pre-line">{rfq.requirements}</p></>)}
            <p className="mt-4 text-[13px] text-muted">Request open until</p>
            <p>{formatDateTime(rfq.expiresAt, v.user.timezone)}</p>
          </div>
          {['SUBMITTED', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'].includes(rfq.status) && (
            <InlineAction action={cancelRfqAction} hidden={{ reference: rfq.reference }} label="Cancel request" variant="danger" reason={{ label: 'Reason (optional)' }} />
          )}
        </aside>
      </div>
    </>
  );
}
