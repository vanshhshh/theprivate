'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useFieldError } from '@/components/ui/form';
import { fieldLabel } from '@/components/ui/styles';
import { cn } from '@/lib/cn';

export interface AirportPick {
  id: string;
  icao: string | null;
  iata: string | null;
  name: string;
  city: string | null;
  countryCode: string;
  lat: number;
  lon: number;
}

export const airportCode = (a: Pick<AirportPick, 'iata' | 'icao'>) => a.iata ?? a.icao ?? '';

/** Accessible combobox (WAI-ARIA 1.2 pattern) backed by /api/airports. Submits the airport id. */
export function AirportCombobox({ name, label, initial, onPick, placeholder = 'City, airport or code' }: { name: string; label: string; initial?: AirportPick | null; onPick?: (a: AirportPick | null) => void; placeholder?: string }) {
  const id = useId();
  const error = useFieldError(name);
  const [query, setQuery] = useState(initial ? `${initial.city ?? initial.name} · ${airportCode(initial)}` : '');
  const [picked, setPicked] = useState<AirportPick | null>(initial ?? null);
  const [options, setOptions] = useState<AirportPick[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (picked && query === `${picked.city ?? picked.name} · ${airportCode(picked)}`) return;
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      setLoading(true);
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`, { signal: abort.current.signal });
        if (res.ok) {
          setOptions((await res.json()).airports);
          setActive(0);
          setOpen(true);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => clearTimeout(t);
  }, [query, picked]);

  function choose(a: AirportPick) {
    setPicked(a);
    setQuery(`${a.city ?? a.name} · ${airportCode(a)}`);
    setOpen(false);
    onPick?.(a);
  }

  return (
    <div className="group relative flex flex-col gap-1">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input type="hidden" name={name} value={picked?.id ?? ''} />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          if (picked) {
            setPicked(null);
            onPick?.(null);
          }
        }}
        onFocus={() => options.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        className={cn('font-display w-full border-0 border-b border-line-strong bg-transparent py-2 text-[24px] leading-tight placeholder:font-sans placeholder:text-[17px] placeholder:text-muted/60 transition-[border-color,box-shadow] focus:border-ink focus:shadow-[0_1px_0_0_var(--color-magenta)] focus:outline-none', error && 'border-danger')}
      />
      {loading && <span className="absolute right-0 top-8 size-3 animate-spin rounded-full border-2 border-muted border-r-transparent" aria-hidden />}
      {error && <p className="text-sm text-danger">{error}</p>}
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-line bg-paper py-2 shadow-[0_30px_60px_-24px_rgba(17,21,24,.45)] [animation:rise_var(--dur-2)_var(--ease-climb)_both]">
          {options.length === 0 && !loading && <li className="px-4 py-3 text-sm text-muted">No airports match “{query}”.</li>}
          {options.map((a, i) => (
            <li
              key={a.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(a);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-baseline gap-3 px-4 py-2.5 transition-colors', i === active && 'bg-paper-2')}
            >
              <span className="strip w-12 shrink-0 text-sm text-magenta">{airportCode(a)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{a.city ?? a.name}</span>
                <span className="block truncate text-xs text-muted">
                  {a.name} · {a.countryCode}
                  {a.icao && a.iata ? ` · ${a.icao}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
