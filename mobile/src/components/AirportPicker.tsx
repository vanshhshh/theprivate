import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { AirportOption } from '@/api/types';
import { recentAirports, rememberAirport } from '@/state/plan';
import { Icon } from './Icon';
import { Sheet } from './ui';

/**
 * Full-screen airport search: name, city, IATA or ICAO. Debounced, cancellable, at most 8 results
 * (ranked by the server). Recent choices appear first. Never renders thousands of rows.
 */
export function AirportPicker({ open, title, exclude, onPick, onClose }: { open: boolean; title: string; exclude?: string | null; onPick: (a: AirportOption) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AirportOption[]>([]);
  const [recent, setRecent] = useState<AirportOption[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setResults([]);
    void recentAirports().then(setRecent);
    const t = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setState('idle');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setState('loading');
      api<AirportOption[]>(`/api/mobile/v1/airports?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, timeoutMs: 8000 })
        .then((r) => {
          setResults(r);
          setState('idle');
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setState('error');
          setError(e instanceof ApiError ? e.message : 'Search failed.');
        });
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (a: AirportOption) => {
    void rememberAirport(a);
    onPick(a);
    onClose();
  };

  const list = q.trim().length >= 2 ? results : recent;
  return (
    <Sheet open={open} title={title} onClose={onClose} tall>
      <div className="sticky top-0 z-10 -mx-6 bg-paper px-6 pb-3">
        <label className="flex h-13 items-center gap-3 rounded-full bg-paper-2 px-4">
          <Icon name="search" className="size-5 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="City, airport or code"
            aria-label="Search airports"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/70"
          />
          {state === 'loading' && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-muted border-r-transparent" />}
        </label>
      </div>
      {q.trim().length < 2 && recent.length > 0 && <p className="strip mt-2 text-[11px] uppercase tracking-[0.2em] text-muted">Recent</p>}
      {state === 'error' && <p className="py-6 text-[14px] text-danger">{error}</p>}
      {q.trim().length >= 2 && state === 'idle' && results.length === 0 && <p className="py-8 text-center text-[15px] text-ink-2">No airports match “{q.trim()}”.</p>}
      <ul className="divide-y divide-line">
        {list.map((a) => {
          const disabled = a.id === exclude;
          return (
            <li key={a.id}>
              <button type="button" disabled={disabled} onClick={() => pick(a)} className="grid w-full grid-cols-[64px_1fr] items-center gap-3 py-3.5 text-left disabled:opacity-40">
                <span className="strip text-[15px] font-medium text-ink">{a.iata ?? a.icao}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-ink">{a.city ?? a.name}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {a.name} · {a.country}
                    {a.icao && a.iata ? ` · ${a.icao}` : ''}
                    {a.kind === 'HELIPORT' ? ' · Heliport' : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
