import { cn } from '@/lib/cn';

type Place = { iata: string | null; icao: string | null; city: string | null; name: string };

export const placeCode = (a: { iata: string | null; icao: string | null }) => a.iata ?? a.icao ?? '—';
export const placeName = (a: Place) => a.city ?? a.name;

/**
 * The journey signature used wherever a route appears: city names in display type, codes in mono,
 * and a drawn arc between them. `tone="dark"` for use on photography or night surfaces.
 */
export function Journey({ from, to, size = 'md', tone = 'light', className }: { from: Place; to: Place; size?: 'sm' | 'md' | 'lg'; tone?: 'light' | 'dark'; className?: string }) {
  const name = { sm: 'text-[20px]', md: 'text-[28px] md:text-[34px]', lg: 'text-[40px] md:text-[64px]' }[size];
  const muted = tone === 'dark' ? 'text-paper/55' : 'text-muted';
  return (
    <div className={cn('grid grid-cols-[minmax(0,auto)_minmax(48px,1fr)_minmax(0,auto)] items-end gap-4', className)}>
      <div className="min-w-0">
        <p className={cn('strip text-[12px] tracking-[0.18em]', muted)}>{placeCode(from)}</p>
        <p className={cn('font-display truncate leading-none', name)}>{placeName(from)}</p>
      </div>
      <div aria-hidden className={cn('journey-arc relative mb-[0.45em] h-5', tone === 'dark' ? 'text-dusk' : 'text-magenta')}>
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <path d="M1 23 Q50 -8 99 23" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute bottom-0 left-0 size-[5px] -translate-x-1/2 translate-y-1/2 rounded-full bg-current" />
        <span className="absolute bottom-0 right-0 size-[5px] translate-x-1/2 translate-y-1/2 rounded-full bg-current" />
      </div>
      <div className="min-w-0 text-right">
        <p className={cn('strip text-[12px] tracking-[0.18em]', muted)}>{placeCode(to)}</p>
        <p className={cn('font-display truncate leading-none', name)}>{placeName(to)}</p>
      </div>
    </div>
  );
}

/** Kilometres, for customers (nautical miles stay internal). */
export const km = (nm: number) => `${Math.round(nm * 1.852).toLocaleString('en-IN')} km`;
