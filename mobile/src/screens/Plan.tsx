import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { AirportOption } from '@/api/types';
import { AirportPicker } from '@/components/AirportPicker';
import { Icon } from '@/components/Icon';
import { PLATES } from '@/components/Plate';
import { ScreenHero } from '@/components/ScreenHero';
import { Button, Field, inputClass, Notice } from '@/components/ui';
import { todayIn } from '@/lib/format';
import { planProblems, updatePlan, usePlan } from '@/state/plan';

export const CATEGORIES = [
  ['', 'Any'],
  ['TURBOPROP', 'Turboprop'],
  ['LIGHT_JET', 'Light jet'],
  ['MIDSIZE_JET', 'Midsize'],
  ['SUPER_MIDSIZE_JET', 'Super-mid'],
  ['HEAVY_JET', 'Heavy jet'],
  ['ULTRA_LONG_RANGE_JET', 'Long range'],
  ['HELICOPTER_TWIN', 'Helicopter'],
] as const;

const tick = () => void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

function AirportButton({ label, value, onClick }: { label: string; value: AirportOption | null; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[76px] w-full flex-col justify-center py-3 text-left">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
      {value ? (
        <span className="mt-1 flex items-baseline gap-3">
          <span className="strip text-[26px] font-medium leading-none text-ink">{value.iata ?? value.icao}</span>
          <span className="truncate text-[15px] text-ink-2">{value.city ?? value.name}</span>
        </span>
      ) : (
        <span className="mt-1 text-[20px] text-muted/80">Choose airport</span>
      )}
    </button>
  );
}

/** The flight planner: one composed screen, not a wizard. Search, or go straight to a request. */
export function Plan() {
  const p = usePlan();
  const navigate = useNavigate();
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const problems = planProblems(p);
  const minDate = todayIn(p.from?.timezone);

  const go = (to: 'results' | 'request') => {
    if (problems.length) {
      setShowProblems(true);
      return;
    }
    navigate(to === 'results' ? '/plan/results' : '/plan/request');
  };

  return (
    <>
      <ScreenHero plate={PLATES.jetInFlight} eyebrow="Plan a flight" title={<>Your route, <em>your time.</em></>} />

      <div className="px-6 pb-10">
        <div role="radiogroup" aria-label="Trip type" className="-mt-6 relative z-10 grid grid-cols-2 rounded-full bg-paper p-1 shadow-[0_8px_30px_-12px_rgba(14,20,24,0.35)]">
          {(['ONE_WAY', 'RETURN'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={p.tripType === t}
              onClick={() => (tick(), updatePlan({ tripType: t }))}
              className={`h-11 rounded-full text-[14px] font-medium transition-colors ${p.tripType === t ? 'bg-night text-paper' : 'text-ink-2'}`}
            >
              {t === 'ONE_WAY' ? 'One-way' : 'Return'}
            </button>
          ))}
        </div>

        <div className="relative mt-6 divide-y divide-line border-y border-line">
          <AirportButton label="From" value={p.from} onClick={() => setPicker('from')} />
          <AirportButton label="To" value={p.to} onClick={() => setPicker('to')} />
          <button
            type="button"
            aria-label="Swap departure and arrival"
            onClick={() => (tick(), updatePlan({ from: p.to, to: p.from }))}
            className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-ink-2"
          >
            <Icon name="swap" className="size-5" />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto] gap-x-5 gap-y-6">
          <Field label="Departure date">{(id) => <input id={id} type="date" min={minDate} value={p.date} onChange={(e) => updatePlan({ date: e.target.value })} className={inputClass} />}</Field>
          <Field label="Time (optional)">{(id) => <input id={id} type="time" value={p.time} onChange={(e) => updatePlan({ time: e.target.value })} className={`${inputClass} w-28`} />}</Field>
          {p.tripType === 'RETURN' && (
            <>
              <Field label="Return date">{(id) => <input id={id} type="date" min={p.date || minDate} value={p.returnDate} onChange={(e) => updatePlan({ returnDate: e.target.value })} className={inputClass} />}</Field>
              <Field label="Time (optional)">{(id) => <input id={id} type="time" value={p.returnTime} onChange={(e) => updatePlan({ returnTime: e.target.value })} className={`${inputClass} w-28`} />}</Field>
            </>
          )}
        </div>
        {p.from?.timezone && <p className="mt-2 text-[12.5px] text-muted">Times are local to the departure airport ({p.from.timezone.replace('_', ' ')}).</p>}

        <div className="mt-7 flex items-center justify-between border-b border-line pb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Passengers</p>
            <p className="strip mt-1 text-[26px] leading-none" aria-live="polite">{p.passengers}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" aria-label="Fewer passengers" disabled={p.passengers <= 1} onClick={() => (tick(), updatePlan({ passengers: Math.max(1, p.passengers - 1) }))} className="grid size-12 place-items-center rounded-full border border-line-strong disabled:opacity-30">
              <Icon name="minus" className="size-5" />
            </button>
            <button type="button" aria-label="More passengers" disabled={p.passengers >= 400} onClick={() => (tick(), updatePlan({ passengers: Math.min(400, p.passengers + 1) }))} className="grid size-12 place-items-center rounded-full border border-line-strong disabled:opacity-30">
              <Icon name="plus" className="size-5" />
            </button>
          </div>
        </div>

        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Aircraft</p>
        <div className="-mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
          {CATEGORIES.map(([v, l]) => (
            <button key={v} type="button" onClick={() => (tick(), updatePlan({ category: v }))} aria-pressed={p.category === v} className={`h-10 shrink-0 rounded-full border px-4 text-[14px] ${p.category === v ? 'border-night bg-night text-paper' : 'border-line-strong text-ink-2'}`}>
              {l}
            </button>
          ))}
        </div>

        {showProblems && problems.length > 0 && (
          <div className="mt-6">
            <Notice tone="warning">
              {problems.map((x) => (
                <span key={x} className="block">{x}</span>
              ))}
            </Notice>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={() => go('results')} className="w-full">
            Show aircraft
          </Button>
          <Button variant="secondary" onClick={() => go('request')} className="w-full">
            Send a flight request
          </Button>
        </div>
        <p className="mt-5 text-center text-[12.5px] leading-relaxed text-muted">Flights are operated by independent, licensed partners. Prices come in their offers.</p>
      </div>

      <AirportPicker open={picker === 'from'} title="Flying from" exclude={p.to?.id} onPick={(a) => updatePlan({ from: a })} onClose={() => setPicker(null)} />
      <AirportPicker open={picker === 'to'} title="Flying to" exclude={p.from?.id} onPick={(a) => updatePlan({ to: a })} onClose={() => setPicker(null)} />
    </>
  );
}
