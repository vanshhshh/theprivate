import Link from 'next/link';
import { routeSummary } from '@/components/domain/itinerary';
import { Status } from '@/components/domain/status';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/display';
import { SceneEmpty } from '@/components/cinematic/scene';
import { formatDate } from '@/lib/time';
import { requireViewerPage } from '@/server/auth/viewer';
import { listCustomerRfqs } from '@/server/services/rfq';

export const metadata = { title: 'Trips & requests' };

export default async function Trips() {
  const v = await requireViewerPage('/account/trips');
  const rfqs = await listCustomerRfqs(v.user.id);
  return (
    <>
      <PageHeader eyebrow="Your journeys" title="Trips & requests" actions={<LinkButton href="/charter" arrow>Plan a flight</LinkButton>} />
      {rfqs.length === 0 ? (
        <SceneEmpty scene="wing-dusk" eyebrow="Trips & requests" title={<>Your next journey <em>starts here.</em></>} action={<LinkButton href="/charter" variant="light" size="lg" arrow>Plan a flight</LinkButton>}>
          Every request you send appears here, with the offers you receive.
        </SceneEmpty>
      ) : (
        <ul className="flex flex-col">
          {rfqs.map((r, i) => (
            <Reveal as="li" key={r.id} index={i} className="border-b border-line first:border-t first:border-t-ink">
              <div className="grid gap-4 py-7 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
                <Link href={`/account/trips/${r.reference}`} className="group">
                  <p className="font-display text-[28px] leading-none transition-colors group-hover:text-magenta">
                    {r.legs[0] ? `${r.legs[0].fromAirport.city ?? r.legs[0].fromAirport.name} to ${r.legs.at(-1)!.toAirport.city ?? r.legs.at(-1)!.toAirport.name}` : 'Flight request'}
                  </p>
                  <p className="strip mt-2 text-[13px] text-muted">{routeSummary(r.legs)} · {r.reference}</p>
                </Link>
                <p className="text-[15px] text-ink-2">
                  {r.legs[0] && formatDate(r.legs[0].departureDate, { weekday: 'short', day: 'numeric', month: 'short' })} · {r.passengers} {r.passengers === 1 ? 'passenger' : 'passengers'}
                  {r._count.quotes > 0 && <span className="block text-[14px] text-magenta">{r._count.quotes} {r._count.quotes === 1 ? 'offer' : 'offers'}</span>}
                </p>
                <div className="md:text-right">
                  {r.booking ? (
                    <Link href={`/account/bookings/${r.booking.reference}`} aria-label={`Booking ${r.booking.reference}`}><Status kind="booking" value={r.booking.status} audience="customer" /></Link>
                  ) : (
                    <Status kind="rfq" value={r.status} audience="customer" />
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </>
  );
}
