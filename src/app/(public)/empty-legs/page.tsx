import type { Metadata } from 'next';
import Link from 'next/link';
import { SceneEmpty, SceneHero } from '@/components/cinematic/scene';
import { Journey } from '@/components/domain/journey';
import { categoryLabel } from '@/components/domain/status';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { Pagination } from '@/components/ui/display';
import { fieldControl, fieldLabel } from '@/components/ui/styles';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { listLiveEmptyLegs } from '@/server/services/empty-legs';

export const metadata: Metadata = { title: 'One-way offers', description: 'Seats on private flights already going your way, offered by checked flight partners. Live offers only.' };
export const dynamic = 'force-dynamic';

export default async function EmptyLegs({ searchParams }: { searchParams: Promise<{ country?: string; after?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const country = sp.country === 'IN' || sp.country === 'AE' ? sp.country : undefined;
  const { items, total } = await listLiveEmptyLegs({ country, after: sp.after && /^\d{4}-\d{2}-\d{2}$/.test(sp.after) ? sp.after : undefined }, page);
  return (
    <>
      <SceneHero
        scene="jet-inflight"
        eyebrow="One-way offers"
        title="Already flying"
        titleItalic="your way."
        lede="When a private aircraft has to fly empty to its next journey, its seats can be yours, often for less."
      />
      <section className="mx-auto max-w-[1320px] px-5 pt-14 md:px-12">
        <form action="/empty-legs" className="mb-14 flex flex-wrap items-end gap-x-8 gap-y-5 border-b border-line pb-8">
          <div className="group flex min-w-40 flex-col gap-1">
            <label htmlFor="country" className={fieldLabel}>Departing from</label>
            <select id="country" name="country" defaultValue={country ?? ''} className={fieldControl}>
              <option value="">Anywhere</option>
              <option value="IN">India</option>
              <option value="AE">United Arab Emirates</option>
            </select>
          </div>
          <div className="group flex flex-col gap-1">
            <label htmlFor="after" className={fieldLabel}>On or after</label>
            <input id="after" type="date" name="after" defaultValue={sp.after ?? ''} className={fieldControl} />
          </div>
          <button className="h-11 rounded-full border border-ink/80 px-6 text-[15px] transition-colors hover:bg-ink hover:text-paper">Show offers</button>
          <p className="ml-auto text-[13px] text-muted">{total} live {total === 1 ? 'offer' : 'offers'}</p>
        </form>

        {items.length === 0 ? (
          <SceneEmpty scene="sky-descent" eyebrow="One-way offers" title={<>Nothing in the air <em>just yet.</em></>} action={<LinkButton href="/charter" variant="light" size="lg" arrow>Plan a flight instead</LinkButton>}>
            Offers appear the moment a flight partner publishes a real flight, and leave when it departs.
          </SceneEmpty>
        ) : (
          <>
            <ul className="flex flex-col">
              {items.map((l, i) => (
                <Reveal as="li" key={l.id} index={i} className="border-t border-line first:border-ink">
                  <Link href={`/empty-legs/${l.id}`} className="group grid gap-6 py-8 transition-colors md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-end">
                    <Journey from={l.fromAirport} to={l.toAirport} />
                    <div className="text-[15px]">
                      <p className="strip">{formatDateTime(l.windowStartUtc, l.fromAirport.timezone ?? 'UTC')}</p>
                      <p className="mt-1 text-ink-2">
                        {l.aircraft.aircraftType ? `${l.aircraft.aircraftType.manufacturer} ${l.aircraft.aircraftType.model}` : 'Aircraft'} · {categoryLabel(l.aircraft.aircraftType?.category)} · up to {l.seatsAvailable} seats
                      </p>
                    </div>
                    <div className="flex items-center gap-6 md:justify-end">
                      <p className="strip text-[20px]">{l.customerPrice ? formatMoney(l.customerPrice.toString(), l.currency) : 'Price on request'}</p>
                      <span aria-hidden className="grid size-11 place-items-center rounded-full border border-ink/30 transition-colors duration-[var(--dur-2)] group-hover:border-magenta group-hover:bg-magenta group-hover:text-paper">→</span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </ul>
            <Pagination page={page} total={total} perPage={24} href={(p) => `/empty-legs?${new URLSearchParams({ ...(country ? { country } : {}), ...(sp.after ? { after: sp.after } : {}), page: String(p) })}`} />
          </>
        )}
        <p className="mt-12 max-w-2xl text-[13px] leading-relaxed text-muted">The price is for the whole aircraft. Times can change if the aircraft&apos;s schedule changes, and an enquiry does not hold the flight.</p>
      </section>
    </>
  );
}
