import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { apiUrl } from '@/api/client';
import type { Listing, OneWay, Page } from '@/api/types';
import { Icon } from '@/components/Icon';
import { PLATES } from '@/components/Plate';
import { ScreenHero } from '@/components/ScreenHero';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { instant, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

export function OneWayRow({ l }: { l: OneWay }) {
  return (
    <li>
      <Link to={`/explore/one-way/${l.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-5">
        <div className="min-w-0">
          <p className="strip text-[20px] leading-none">{l.from.code} <span className="text-muted">→</span> {l.to.code}</p>
          <p className="mt-2 truncate text-[13.5px] text-ink-2">{l.from.city ?? l.from.name} to {l.to.city ?? l.to.name}</p>
          <p className="mt-1 truncate text-[12.5px] text-muted">
            {instant(l.windowStart, l.from.timezone, { day: 'numeric', month: 'short' })} · {l.aircraft.type} · up to {l.seats} seats
          </p>
        </div>
        <div className="text-right">
          {l.price ? <p className="strip text-[15px]">{money(l.price.amount, l.price.currency, { compact: true })}</p> : <p className="text-[13px] text-muted">Price on enquiry</p>}
          <Icon name="chevron-right" className="ml-auto mt-1 size-5 text-muted" />
        </div>
      </Link>
    </li>
  );
}

export function ListingCard({ l }: { l: Listing }) {
  const [broken, setBroken] = useState(false);
  const photo = broken ? undefined : l.photos[0];
  return (
    <li>
      <Link to={`/explore/aircraft/${l.id}`} className="block border-b border-line py-5">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] bg-night">
          {photo ? (
            <img src={apiUrl(photo.url)} alt={photo.caption ?? l.headline} loading="lazy" decoding="async" onError={() => setBroken(true)} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-[13px] text-paper/50">Photos on request</div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-night/70 px-3 py-1 text-[11.5px] text-paper backdrop-blur-md">{l.category.label}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <h3 className="font-display min-w-0 truncate text-[22px] leading-tight">{l.manufacturer} {l.model}</h3>
          <p className="strip shrink-0 text-[14px]">{l.price ? money(l.price.amount, l.price.currency, { compact: true }) : 'Price on request'}</p>
        </div>
        <p className="mt-1 truncate text-[13.5px] text-ink-2">{l.year} · {l.location}</p>
      </Link>
    </li>
  );
}

/** One-way offers and aircraft for sale. Only live, published listings ever appear. */
export function Explore() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'aircraft' ? 'aircraft' : 'one-way';
  const legs = useApi<Page<OneWay>>(tab === 'one-way' ? '/api/mobile/v1/one-way' : null);
  const sale = useApi<Page<Listing>>(tab === 'aircraft' ? '/api/mobile/v1/aircraft' : null);
  const cur = tab === 'one-way' ? legs : sale;

  return (
    <>
      <ScreenHero plate={PLATES.jetsRamp} eyebrow="Explore" title={<>One-way offers <em>&amp; aircraft.</em></>} />
      <div className="sticky top-0 z-20 bg-paper/95 px-6 pb-3 pt-4 backdrop-blur-lg">
        <div role="tablist" aria-label="Explore" className="grid grid-cols-2 rounded-full bg-paper-2 p-1">
          {(['one-way', 'aircraft'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setSp(t === 'aircraft' ? { tab: t } : {}, { replace: true })} className={`h-10 rounded-full text-[14px] font-medium ${tab === t ? 'bg-night text-paper' : 'text-ink-2'}`}>
              {t === 'one-way' ? 'One-way offers' : 'Aircraft for sale'}
            </button>
          ))}
        </div>
      </div>
      {cur.loading && !cur.data && <Skeleton lines={4} />}
      {cur.error && <ErrorState error={cur.error} onRetry={cur.reload} />}
      {tab === 'one-way' && legs.data && (
        legs.data.items.length === 0 ? (
          <EmptyState title="No one-way offers right now">When a partner publishes an aircraft flying empty on a route, it appears here, usually at a lower price.</EmptyState>
        ) : (
          <ul className="px-6">{legs.data.items.map((l) => <OneWayRow key={l.id} l={l} />)}</ul>
        )
      )}
      {tab === 'aircraft' && sale.data && (
        sale.data.items.length === 0 ? (
          <EmptyState title="No aircraft listed yet">Approved aircraft for sale appear here once reviewed by our team.</EmptyState>
        ) : (
          <ul className="px-6">{sale.data.items.map((l) => <ListingCard key={l.id} l={l} />)}</ul>
        )
      )}
    </>
  );
}
