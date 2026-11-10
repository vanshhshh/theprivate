import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HeaderOver } from '@/components/cinematic/header-over';
import { Journey, placeCode } from '@/components/domain/journey';
import { categoryLabel } from '@/components/domain/status';
import { RouteMap } from '@/components/motion/route-map';
import { LinkButton } from '@/components/ui/button';
import { DL, Notice, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, Input, SubmitButton, Textarea } from '@/components/ui/form';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { getViewer } from '@/server/auth/viewer';
import { getLiveEmptyLeg } from '@/server/services/empty-legs';
import { emptyLegEnquiryAction } from '../../actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const l = await getLiveEmptyLeg((await params).id);
  return l ? { title: `One-way offer ${placeCode(l.fromAirport)} → ${placeCode(l.toAirport)}` } : { title: 'One-way offer' };
}

export default async function EmptyLeg({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l, v] = await Promise.all([getLiveEmptyLeg(id), getViewer()]);
  if (!l) notFound();
  const tz = l.fromAirport.timezone ?? 'UTC';
  const aircraft = l.aircraft.aircraftType ? `${l.aircraft.aircraftType.manufacturer} ${l.aircraft.aircraftType.model}` : 'Aircraft';
  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden bg-night text-paper">
        <HeaderOver />
        <div aria-hidden className="absolute inset-0">
          <RouteMap
            from={{ lat: Number(l.fromAirport.latitude), lon: Number(l.fromAirport.longitude), code: placeCode(l.fromAirport), city: l.fromAirport.city ?? l.fromAirport.name }}
            to={{ lat: Number(l.toAirport.latitude), lon: Number(l.toAirport.longitude), code: placeCode(l.toAirport), city: l.toAirport.city ?? l.toAirport.name }}
            inset={{ top: 0.14, bottom: 0.5 }}
            labels={false}
          />
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-night via-night/70 to-transparent" />
        <div className="relative mx-auto max-w-[1320px] px-5 pb-14 pt-[42svh] md:px-12">
          <p className="resolve-late strip mb-6 text-[11px] uppercase tracking-[0.22em] text-dusk">One-way offer · live</p>
          <Journey from={l.fromAirport} to={l.toAirport} size="lg" tone="dark" />
          <p className="resolve-late strip mt-8 text-[15px] text-paper/80">Departs between {formatDateTime(l.windowStartUtc, tz)} and {formatDateTime(l.windowEndUtc, tz)}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1320px] gap-14 px-5 py-16 md:px-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle>The flight</SectionTitle>
          <DL items={[
            ['Aircraft', `${aircraft} · ${categoryLabel(l.aircraft.aircraftType?.category)}`],
            ['Seats', `Up to ${l.seatsAvailable}`],
            ['Operated by', l.operator.isPubliclyListed ? <Link key="o" className="link-draw" href={`/operators/${l.operator.slug}`}>{l.operator.displayName}</Link> : l.operator.displayName],
            ['Price', l.customerPrice ? `${formatMoney(l.customerPrice.toString(), l.currency)} for the aircraft` : 'On request'],
          ]} />
          {l.notes && <p className="mt-8 whitespace-pre-line text-[17px] leading-relaxed text-ink-2">{l.notes}</p>}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm bg-paper-2/70 p-7 md:p-9">
            <h2 className="font-display text-[32px] leading-tight">Interested in <em>this flight?</em></h2>
            <div className="my-6"><Notice>This flight can change if the aircraft&apos;s schedule changes. Enquiring does not hold or book it.</Notice></div>
            {v ? (
              <ActionForm action={emptyLegEnquiryAction} resetOnSuccess className="grid gap-6">
                <input type="hidden" name="id" value={l.id} />
                <Field name="passengers" label="Passengers"><Input name="passengers" type="number" min={1} max={l.seatsAvailable} defaultValue={1} required className="strip" /></Field>
                <Field name="message" label="Message (optional)"><Textarea name="message" rows={3} /></Field>
                <SubmitButton>Send enquiry</SubmitButton>
              </ActionForm>
            ) : (
              <LinkButton href={`/sign-in?next=/empty-legs/${l.id}`} arrow>Sign in to enquire</LinkButton>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
