import { Navigate, useNavigate } from 'react-router';
import type { SearchResponse, SearchResult } from '@/api/types';
import { Icon } from '@/components/Icon';
import { EmptyState, ErrorState, LinkButton, Skeleton, StatusChip, TopBar } from '@/components/ui';
import { localDate, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { planProblems, updatePlan, usePlan, usePlanReady } from '@/state/plan';

const RANGE: Record<SearchResult['rangeNote'], string> = { OK: 'Within range', MAY_NEED_STOP: 'May need a fuel stop', UNVERIFIED: 'Range not verified' };

function ResultCard({ r, onRequest }: { r: SearchResult; onRequest: () => void }) {
  return (
    <li className="border-b border-line py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="strip text-[11px] uppercase tracking-[0.18em] text-muted">{r.category?.label ?? 'Aircraft'}</p>
          <h3 className="font-display mt-1 text-[24px] leading-tight">{r.type}</h3>
          <p className="mt-1 text-[14px] text-ink-2">
            {r.partner.name}
            {r.homeBase ? ` · based ${r.homeBase}` : ''}
          </p>
        </div>
        <StatusChip status={r.availability} className="shrink-0" />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[13.5px]">
        <dt className="text-muted">Seats</dt>
        <dd className="strip text-right">{r.seats}</dd>
        <dt className="text-muted">Range</dt>
        <dd className="text-right">{RANGE[r.rangeNote]}</dd>
        {r.indicative && (
          <>
            <dt className="text-muted">Indicative price</dt>
            <dd className="strip text-right">
              {money(r.indicative.low, r.indicative.currency, { compact: true })} – {money(r.indicative.high, r.indicative.currency, { compact: true })}
            </dd>
          </>
        )}
      </dl>
      {r.indicative && <p className="mt-2 text-[12px] text-muted">Indicative only. The final price comes in the partner’s offer.</p>}
      <button type="button" onClick={onRequest} className="mt-4 inline-flex h-11 items-center gap-2 text-[14px] font-medium text-magenta">
        Request this flight <Icon name="arrow-right" className="size-4" />
      </button>
    </li>
  );
}

/** Search over verified supply. Nothing here is a confirmed offer or availability. */
export function Results() {
  const p = usePlan();
  const navigate = useNavigate();
  const hydrated = usePlanReady();
  const ready = planProblems(p).length === 0;
  const qs = ready
    ? new URLSearchParams({ from: p.from!.id, to: p.to!.id, date: p.date, pax: String(p.passengers), ...(p.category ? { category: p.category } : {}), ...(p.tripType === 'RETURN' && p.returnDate ? { returnDate: p.returnDate } : {}) }).toString()
    : null;
  const { data, error, loading, reload } = useApi<SearchResponse>(qs ? `/api/mobile/v1/search?${qs}` : null);
  if (!hydrated) return null;
  if (!ready) return <Navigate to="/plan" replace />;

  return (
    <div className="min-h-full bg-paper">
      <TopBar title={`${p.from!.iata ?? p.from!.icao} → ${p.to!.iata ?? p.to!.icao}`} />
      <section className="border-b border-line px-6 pb-6 pt-4">
        <p className="font-display text-[30px] leading-tight">
          {p.from!.city ?? p.from!.name} <span className="text-muted">to</span> {p.to!.city ?? p.to!.name}
        </p>
        <p className="strip mt-2 text-[12px] uppercase tracking-[0.12em] text-muted">
          {localDate(p.date)} · {p.passengers} {p.passengers === 1 ? 'passenger' : 'passengers'}
          {data ? ` · ${data.distanceNm.toLocaleString()} nm` : ''}
        </p>
      </section>

      {loading && <Skeleton lines={4} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.results.length === 0 && (
        <EmptyState title="No aircraft listed for this journey yet" action={<LinkButton to="/plan/request">Send a flight request</LinkButton>}>
          We will find one for you. Send a request and licensed flight partners reply with priced offers.
        </EmptyState>
      )}
      {data && data.results.length > 0 && (
        <>
          <p className="px-6 pt-5 text-[13px] leading-relaxed text-muted">Aircraft from verified flight partners. Availability is declared by each partner; send a request to receive confirmed, priced offers.</p>
          <ul className="px-6">
            {data.results.map((r) => (
              <ResultCard
                key={r.aircraftId}
                r={r}
                onRequest={() => {
                  if (r.category) updatePlan({ category: r.category.value });
                  navigate('/plan/request');
                }}
              />
            ))}
          </ul>
          <div className="px-6 py-8">
            <LinkButton to="/plan/request" variant="secondary" className="w-full">
              Not sure? Send a request for any aircraft
            </LinkButton>
          </div>
        </>
      )}
    </div>
  );
}
