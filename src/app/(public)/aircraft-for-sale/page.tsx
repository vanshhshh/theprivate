import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SceneEmpty, SceneHero } from '@/components/cinematic/scene';
import { CATEGORY_OPTIONS, categoryLabel } from '@/components/domain/status';
import { Reveal } from '@/components/motion/motion';
import { LinkButton } from '@/components/ui/button';
import { Pagination } from '@/components/ui/display';
import { fieldControl, fieldLabel } from '@/components/ui/styles';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { listPublishedListings } from '@/server/services/sales';

export const metadata: Metadata = { title: 'Aircraft for sale', description: 'Business jets, turboprops and helicopters for sale. Every listing reviewed by ThePrivate before publication.' };
export const dynamic = 'force-dynamic';

export default async function Market({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { items, total, page, filters } = await listPublishedListings(sp);
  const qs = (p: number) => `/aircraft-for-sale?${new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <SceneHero
        scene="jets-ramp"
        eyebrow="Aircraft for sale"
        title="An aircraft"
        titleItalic="of your own."
        lede="Business jets, turboprops and helicopters, each listing reviewed by ThePrivate before it appears."
      >
        <LinkButton href="/sell-aircraft" variant="glass" arrow>Sell your aircraft</LinkButton>
      </SceneHero>

      <section className="mx-auto max-w-[1320px] px-5 pt-14 md:px-12">
        <form className="mb-14 flex flex-wrap items-end gap-x-8 gap-y-5 border-b border-line pb-8" action="/aircraft-for-sale">
          <div className="group flex min-w-44 flex-col gap-1">
            <label htmlFor="f-category" className={fieldLabel}>Type</label>
            <select id="f-category" name="category" defaultValue={filters.category ?? ''} className={fieldControl}>
              <option value="">All aircraft</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </div>
          <div className="group flex flex-col gap-1">
            <label htmlFor="f-manufacturer" className={fieldLabel}>Manufacturer</label>
            <input id="f-manufacturer" name="manufacturer" defaultValue={filters.manufacturer ?? ''} placeholder="Any" className={fieldControl} />
          </div>
          <div className="group flex w-28 flex-col gap-1">
            <label htmlFor="f-year" className={fieldLabel}>Built from</label>
            <input id="f-year" name="minYear" type="number" min={1950} defaultValue={filters.minYear ?? ''} placeholder="Year" className={cn(fieldControl, 'strip')} />
          </div>
          <div className="group flex min-w-40 flex-col gap-1">
            <label htmlFor="f-sort" className={fieldLabel}>Order</label>
            <select id="f-sort" name="sort" defaultValue={filters.sort ?? 'newest'} className={fieldControl}>
              <option value="newest">Newest first</option><option value="price_asc">Price, low to high</option><option value="price_desc">Price, high to low</option><option value="year_desc">Youngest first</option>
            </select>
          </div>
          <button className="h-11 rounded-full border border-ink/80 px-6 text-[15px] transition-colors hover:bg-ink hover:text-paper">Show aircraft</button>
          <p className="ml-auto text-[13px] text-muted">{total} {total === 1 ? 'aircraft' : 'aircraft'} listed</p>
        </form>

        {items.length === 0 ? (
          <SceneEmpty scene="cabin-warm" eyebrow="Aircraft for sale" title={<>No aircraft <em>match, yet.</em></>} action={<><LinkButton href="/aircraft-for-sale" variant="light" size="lg">See all aircraft</LinkButton><LinkButton href="/sell-aircraft" variant="glass" size="lg" arrow>List your aircraft</LinkButton></>}>
            Every listing is reviewed before it appears. Try fewer filters, or come back soon.
          </SceneEmpty>
        ) : (
          <>
            <ul className="grid gap-x-10 gap-y-20 md:grid-cols-2">
              {items.map((l, i) => {
                const photo = l.media.find((m) => !m.caption);
                const feature = i === 0 && page === 1;
                return (
                  <Reveal as="li" key={l.id} index={i} className={cn(feature && 'md:col-span-2')}>
                    <Link href={`/aircraft-for-sale/${l.slug}`} className={cn('group grid gap-6', feature && 'md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end md:gap-12')}>
                      <div className={cn('img-reveal relative overflow-hidden rounded-sm bg-night', feature ? 'aspect-[16/10]' : 'aspect-[4/3]')}>
                        {photo ? (
                          <Image src={`/api/files/${photo.documentId}`} alt={`${l.manufacturer} ${l.model}`} fill sizes={feature ? '(min-width:768px) 60vw, 100vw' : '(min-width:768px) 45vw, 100vw'} className="object-cover transition-transform duration-[var(--dur-4)] ease-[var(--ease-climb)] group-hover:scale-[1.03]" unoptimized />
                        ) : (
                          <div className="flex h-full flex-col justify-end p-7 text-paper">
                            <span className="font-display text-[36px] leading-none">{l.manufacturer}</span>
                            <span className="mt-2 text-[12px] text-paper/50">Photos on request</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="strip text-[11px] uppercase tracking-[0.2em] text-muted">{l.yearOfManufacture} · {categoryLabel(l.category)}{l.totalTimeHours ? ` · ${l.totalTimeHours.toLocaleString('en-IN')} hours flown` : ''}</p>
                        <h2 className={cn('font-display mt-2 leading-[1.02] transition-colors group-hover:text-magenta', feature ? 'text-[44px] md:text-[60px]' : 'text-[32px]')}>{l.manufacturer} {l.model}</h2>
                        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">{l.headline}</p>
                        <p className="strip mt-5 text-[18px]">{l.priceOnRequest || !l.askingPrice ? 'Price on request' : formatMoney(l.askingPrice.toString(), l.currency, 'en-US')}</p>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
            <Pagination page={page} total={total} perPage={18} href={qs} />
          </>
        )}
      </section>
    </>
  );
}
