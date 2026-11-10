'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { HeaderOver } from '@/components/cinematic/header-over';
import { RouteMap } from '@/components/motion/route-map';
import { FlapText } from '@/components/motion/motion';
import { buttonClass } from '@/components/ui/button';
import { fieldControl, fieldLabel } from '@/components/ui/styles';
import { distanceNm } from '@/lib/geo';
import { cn } from '@/lib/cn';
import { AirportCombobox, airportCode, type AirportPick } from './airport-combobox';
import { CATEGORY_OPTIONS, categoryLabel } from './status';

const today = () => new Date().toISOString().slice(0, 10);

function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)');
    const on = () => setWide(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

/**
 * The flight planner (GET → /charter). Same fields and names as always; presented as a
 * conversation: where from, where to, when, who.
 * - `variant="stage"`: the planner floats on glass over the live route map, which fills the
 *   whole section; the camera flies to the chosen route in the open part of the screen.
 * - `variant="glass"`: the planner alone, on glass (e.g. "Change journey").
 */
export function CharterSearch({ initial, variant = 'stage', compact = false, heading, className, backdrop }: { initial?: { from?: AirportPick | null; to?: AirportPick | null; date?: string; returnDate?: string; pax?: number; category?: string }; variant?: 'stage' | 'glass'; compact?: boolean; heading?: ReactNode; className?: string; backdrop?: ReactNode }) {
  const wide = useWide();
  const [from, setFrom] = useState<AirportPick | null>(initial?.from ?? null);
  const [to, setTo] = useState<AirportPick | null>(initial?.to ?? null);
  const [trip, setTrip] = useState<'ONE_WAY' | 'RETURN'>(initial?.returnDate ? 'RETURN' : 'ONE_WAY');
  const [pax, setPax] = useState<number>(initial?.pax ?? 2);
  const nm = from && to ? Math.round(distanceNm(from, to)) : null;
  const place = (a: AirportPick | null) => (a ? { lat: a.lat, lon: a.lon, code: airportCode(a), city: a.city ?? a.name } : null);

  const form = (
    <form action="/charter" method="get" className="glass flex flex-col gap-7 rounded-[28px] p-6 text-ink md:p-9">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="radiogroup" aria-label="Trip type" className="flex gap-1 rounded-full bg-ink/5 p-1 text-sm">
          {(['ONE_WAY', 'RETURN'] as const).map((t) => (
            <label key={t} className={cn('cursor-pointer rounded-full px-4 py-1.5 transition-colors duration-[var(--dur-2)]', trip === t ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink')}>
              <input type="radio" name="trip" value={t} checked={trip === t} onChange={() => setTrip(t)} className="sr-only" />
              {t === 'ONE_WAY' ? 'One way' : 'Return'}
            </label>
          ))}
        </div>
        <p className="text-[13px] text-muted" aria-live="polite">
          {nm !== null ? (
            <>
              Direct distance <FlapText value={`${Math.round(nm * 1.852).toLocaleString('en-IN')} km`} className="text-ink" />
            </>
          ) : (
            'Choose your departure and destination'
          )}
        </p>
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <AirportCombobox name="from" label="Where from?" placeholder="City or airport" initial={initial?.from} onPick={setFrom} />
        <AirportCombobox name="to" label="Where to?" placeholder="City or airport" initial={initial?.to} onPick={setTo} />
      </div>

      <div className={cn('grid grid-cols-2 gap-7', compact && 'lg:grid-cols-4')}>
        <div className="group flex flex-col gap-1">
          <label htmlFor="date" className={fieldLabel}>Departure date</label>
          <input id="date" name="date" type="date" required min={today()} defaultValue={initial?.date ?? ''} className={fieldControl} />
        </div>
        {trip === 'RETURN' ? (
          <div className="group flex flex-col gap-1">
            <label htmlFor="returnDate" className={fieldLabel}>Return date</label>
            <input id="returnDate" name="returnDate" type="date" min={today()} defaultValue={initial?.returnDate ?? ''} className={fieldControl} />
          </div>
        ) : (
          <div aria-hidden className={cn('hidden', compact && 'lg:block')} />
        )}
        <div className="group flex flex-col gap-1">
          <label htmlFor="pax" className={fieldLabel}>Passengers</label>
          <div className="flex items-center border-b border-line-strong focus-within:border-ink">
            <button type="button" aria-label="One fewer passenger" onClick={() => setPax((p) => Math.max(1, p - 1))} className="grid size-8 place-items-center rounded-full text-lg text-ink-2 hover:bg-ink/5">−</button>
            <input id="pax" name="pax" type="number" min={1} max={400} required value={pax} onChange={(e) => setPax(Number(e.target.value) || 1)} className="strip w-full min-w-0 border-0 bg-transparent py-3 text-center text-[17px] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
            <button type="button" aria-label="One more passenger" onClick={() => setPax((p) => Math.min(400, p + 1))} className="grid size-8 place-items-center rounded-full text-lg text-ink-2 hover:bg-ink/5">+</button>
          </div>
        </div>
        <div className="group flex flex-col gap-1">
          <label htmlFor="category" className={fieldLabel}>Aircraft size</label>
          <select id="category" name="category" defaultValue={initial?.category ?? ''} className={cn(fieldControl, 'cursor-pointer')}>
            <option value="">Any size</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        <button type="submit" className={buttonClass('primary', 'lg')}>
          Show aircraft <span className="arrow" aria-hidden>→</span>
        </button>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">Free to search. Nothing is booked until you choose an offer.</p>
      </div>
    </form>
  );

  if (variant === 'glass') return form;
  return (
    <div className={cn('relative isolate overflow-hidden bg-night text-paper', className)}>
      <HeaderOver />
      {backdrop}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <RouteMap from={place(from)} to={place(to)} inset={wide ? { left: 0.5, top: 0.12, bottom: 0.08 } : { top: 0.1, bottom: 0.66 }} />
      </div>
      <div className="relative mx-auto flex min-h-[inherit] max-w-[1320px] flex-col justify-end gap-10 px-5 pb-10 pt-[46svh] md:px-12 md:pb-14 lg:pt-28">
        {heading && <div className="max-w-[620px]">{heading}</div>}
        <div className="max-w-[620px]">{form}</div>
      </div>
    </div>
  );
}
