import { formatDate } from '@/lib/time';

interface LegLike {
  sequence: number;
  departureDate: Date;
  departureTimeLocal: string | null;
  passengers: number;
  fromAirport: { icao: string | null; iata: string | null; city: string | null; name: string };
  toAirport: { icao: string | null; iata: string | null; city: string | null; name: string };
}

const code = (a: { iata: string | null; icao: string | null }) => a.iata ?? a.icao ?? '—';

/** Flight-strip itinerary: one row per leg, codes in mono, local times labelled. */
export function Itinerary({ legs }: { legs: LegLike[] }) {
  return (
    <ol className="border-t border-ink">
      {legs.map((l) => (
        <li key={l.sequence} className="grid grid-cols-[32px_1fr_auto] items-center gap-4 border-b border-line py-5 sm:grid-cols-[32px_1fr_1fr_auto]">
          <span className="strip text-[12px] text-magenta">{String(l.sequence).padStart(2, '0')}</span>
          <div className="flex items-baseline gap-3">
            <span className="strip text-[20px]">{code(l.fromAirport)}</span>
            <span aria-hidden className="h-px w-8 bg-ink-2" />
            <span className="strip text-[20px]">{code(l.toAirport)}</span>
          </div>
          <p className="hidden text-[15px] text-ink-2 sm:block">
            {l.fromAirport.city ?? l.fromAirport.name} to {l.toAirport.city ?? l.toAirport.name}
          </p>
          <p className="text-right text-[15px]">
            {formatDate(l.departureDate, { weekday: 'short', day: 'numeric', month: 'short' })}
            <span className="block text-[13px] text-muted">{l.departureTimeLocal ? `${l.departureTimeLocal} local` : 'Flexible time'} · {l.passengers} {l.passengers === 1 ? 'passenger' : 'passengers'}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export function routeSummary(legs: LegLike[]) {
  if (!legs.length) return '';
  return [code(legs[0]!.fromAirport), ...legs.map((l) => code(l.toAirport))].join(' → ');
}
