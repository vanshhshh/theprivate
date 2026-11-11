import { Haptics, NotificationType } from '@capacitor/haptics';
import { useEffect, useState } from 'react';
import { enablePush, pushPermission } from '@/native/push';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { api, ApiError } from '@/api/client';
import type { Offer, RequestDetail as Detail } from '@/api/types';
import { Button, ErrorState, Notice, Section, Sheet, Skeleton, StatusChip, TopBar } from '@/components/ui';
import { localDate, money, relative } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const OPEN = ['SUBMITTED', 'REVISED'];

function OfferCard({ o, compare, onView }: { o: Offer; compare: boolean; onView: () => void }) {
  const open = OPEN.includes(o.status.value);
  const expired = new Date(o.validUntil).getTime() <= Date.now();
  return (
    <article className={`flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col rounded-[22px] bg-night p-5 text-paper ${open && !expired ? '' : 'opacity-70'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="strip text-[11px] uppercase tracking-[0.18em] text-dusk">{o.aircraft.category?.label ?? 'Aircraft'}</p>
        <StatusChip status={o.status} />
      </div>
      <h3 className="font-display mt-2 text-[26px] leading-tight">{o.aircraft.type}</h3>
      <p className="mt-1 text-[13.5px] text-paper/70">
        {o.partner.name}
        {o.aircraft.year ? ` · ${o.aircraft.year}` : ''}
        {o.aircraft.seats ? ` · ${o.aircraft.seats} seats` : ''}
      </p>
      <p className="strip mt-6 text-[30px] leading-none">{money(o.price, o.currency)}</p>
      <p className="mt-1.5 text-[12.5px] text-paper/60">Total incl. {money(o.taxes, o.currency)} taxes and fees</p>
      {compare && (
        <dl className="mt-4 space-y-1.5 border-t border-night-line pt-4 text-[13px]">
          <div className="flex justify-between gap-3"><dt className="text-paper/55">Includes</dt><dd className="text-right">{o.inclusions.slice(0, 3).join(', ') || '—'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-paper/55">Excludes</dt><dd className="text-right">{o.exclusions.slice(0, 3).join(', ') || '—'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-paper/55">Range</dt><dd>{o.aircraft.rangeNm ? `${o.aircraft.rangeNm.toLocaleString()} nm` : 'Not stated'}</dd></div>
        </dl>
      )}
      <p className="mt-4 text-[12.5px] text-paper/60">{expired ? 'This offer has expired' : `Valid until ${new Date(o.validUntil).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${relative(o.validUntil)})`}</p>
      <div className="mt-auto pt-5">
        <Button variant="light" onClick={onView} className="w-full">
          View offer
        </Button>
      </div>
    </article>
  );
}

/** One request: its route, status and the offers received, compared side by side. */
export function RequestDetail() {
  const { ref = '' } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<Detail>(`/api/mobile/v1/requests/${encodeURIComponent(ref)}`);
  const [compare, setCompare] = useState(false);
  const [viewing, setViewing] = useState<Offer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [askPush, setAskPush] = useState(false);
  useEffect(() => {
    if (sp.get('new')) void pushPermission().then((p) => setAskPush(p === 'prompt'));
  }, [sp]);

  const accept = async (o: Offer) => {
    setBusy(true);
    setActionError(null);
    try {
      const r = await api<{ booking: string }>(`/api/mobile/v1/offers/${o.id}/accept`, { method: 'POST', body: { revision: o.revision, confirm: true }, timeoutMs: 25_000 });
      void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      navigate(`/journeys/booking/${r.booking}?new=1`, { replace: true });
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
      reload(); // show the current terms if the offer changed meanwhile
    } finally {
      setBusy(false);
    }
  };

  const simple = async (path: string, body?: unknown) => {
    setBusy(true);
    setActionError(null);
    try {
      await api(path, { method: 'POST', body: body ?? {} });
      setViewing(null);
      setCancelOpen(false);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return (<><TopBar title={ref} /><Skeleton /></>);
  if (error) return (<><TopBar title={ref} /><ErrorState error={error} onRetry={reload} /></>);
  if (!data) return null;

  const openOffers = data.offers.filter((o) => OPEN.includes(o.status.value) && new Date(o.validUntil).getTime() > Date.now());
  const cancellable = ['SUBMITTED', 'MATCHING', 'AWAITING_QUOTES', 'QUOTES_AVAILABLE'].includes(data.status.value);

  return (
    <div className="min-h-full bg-paper">
      <TopBar title={data.reference} />
      {sp.get('new') && (
        <div className="px-6 pt-4">
          <Notice tone="success">Request received. Licensed partners are being contacted; we’ll notify you when offers arrive. Nothing has been charged.</Notice>
        </div>
      )}
      {askPush && (
        <div className="mx-6 mt-4 rounded-[18px] bg-night p-5 text-paper">
          <p className="font-display text-[22px] leading-tight">Get notified when offers arrive</p>
          <p className="mt-1.5 text-[14px] text-paper/75">We’ll only notify you about your requests, offers and trips.</p>
          <div className="mt-4 flex gap-3">
            <Button variant="light" onClick={() => void enablePush().finally(() => setAskPush(false))}>Turn on</Button>
            <Button variant="ghost" className="text-paper decoration-paper/40" onClick={() => setAskPush(false)}>Not now</Button>
          </div>
        </div>
      )}
      <section className="px-6 pb-4 pt-5">
        <StatusChip status={data.status} />
        {data.legs.map((l, i) => (
          <div key={i} className="mt-4 flex items-end justify-between border-b border-line pb-4">
            <div>
              <p className="strip text-[26px] leading-none">{l.from.code} <span className="text-muted">→</span> {l.to.code}</p>
              <p className="mt-1.5 text-[13.5px] text-ink-2">{l.from.city ?? l.from.name} to {l.to.city ?? l.to.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[14px]">{localDate(l.date, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="strip text-[12px] text-muted">{l.time ? `${l.time} local` : 'Flexible'}</p>
            </div>
          </div>
        ))}
        <p className="mt-3 text-[14px] text-ink-2">
          {data.passengers} passengers{data.category ? ` · ${data.category.label}` : ''}
          {data.partnersContacted > 0 ? ` · ${data.partnersContacted} partners contacted` : ''}
        </p>
      </section>

      {data.booking && (
        <Section title="Booking">
          <Button variant="secondary" className="w-full" onClick={() => navigate(`/journeys/booking/${data.booking!.reference}`)}>
            View booking {data.booking.reference}
          </Button>
        </Section>
      )}

      <Section title={`Offers (${data.offers.length})`} aside={data.offers.length > 1 ? <button type="button" onClick={() => setCompare((c) => !c)} className="text-[13px] font-medium text-sectional">{compare ? 'Hide details' : 'Compare'}</button> : null}>
        {data.offers.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-ink-2">No offers yet. We’ll notify you as soon as a partner sends one.</p>
        ) : (
          <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
            {data.offers.map((o) => <OfferCard key={o.id} o={o} compare={compare} onView={() => (setActionError(null), setViewing(o))} />)}
          </div>
        )}
      </Section>

      {cancellable && (
        <div className="px-6 pb-12">
          <Button variant="danger" className="w-full" onClick={() => (setActionError(null), setCancelOpen(true))}>
            Cancel request
          </Button>
        </div>
      )}

      <Sheet open={!!viewing} title="Offer details" onClose={() => (setViewing(null), setConfirming(false))}>
        {viewing && (
          <div className="pb-4">
            <p className="font-display text-[26px] leading-tight">{viewing.aircraft.type}</p>
            <p className="mt-1 text-[14px] text-ink-2">{viewing.partner.name} · revision {viewing.revision}</p>
            <p className="strip mt-5 text-[32px] leading-none">{money(viewing.price, viewing.currency)}</p>
            <p className="mt-1.5 text-[13px] text-muted">Total, including {money(viewing.taxes, viewing.currency)} taxes and fees</p>
            {viewing.inclusions.length > 0 && (<><h3 className="mt-6 text-[12px] font-medium uppercase tracking-[0.1em] text-muted">Included</h3><ul className="mt-2 list-disc pl-5 text-[14.5px] leading-relaxed">{viewing.inclusions.map((x) => <li key={x}>{x}</li>)}</ul></>)}
            {viewing.exclusions.length > 0 && (<><h3 className="mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-muted">Not included</h3><ul className="mt-2 list-disc pl-5 text-[14.5px] leading-relaxed">{viewing.exclusions.map((x) => <li key={x}>{x}</li>)}</ul></>)}
            {viewing.terms && (<><h3 className="mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-muted">Conditions</h3><p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{viewing.terms}</p></>)}
            <p className="mt-5 text-[13px] text-muted">Valid until {new Date(viewing.validUntil).toLocaleString()}</p>
            {actionError && <div className="mt-4"><Notice tone={actionError.uncertain ? 'warning' : 'danger'}>{actionError.uncertain ? 'We couldn’t confirm whether your acceptance reached us. Refresh this request before trying again.' : actionError.message}</Notice></div>}
            {openOffers.some((o) => o.id === viewing.id) && (
              confirming ? (
                <div className="mt-6 rounded-sm bg-paper-2 p-4">
                  <p className="text-[14.5px] leading-relaxed">
                    You are accepting <strong>{money(viewing.price, viewing.currency)}</strong> from <strong>{viewing.partner.name}</strong> under the conditions above. The partner then confirms the aircraft and crew; payment is arranged after confirmation.
                  </p>
                  <Button busy={busy} className="mt-4 w-full" onClick={() => void accept(viewing)}>Confirm acceptance</Button>
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setConfirming(false)}>Go back</Button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  <Button className="w-full" onClick={() => setConfirming(true)}>Accept this offer</Button>
                  <Button variant="secondary" busy={busy} className="w-full" onClick={() => void simple(`/api/mobile/v1/offers/${viewing.id}/decline`)}>Decline</Button>
                </div>
              )
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={cancelOpen} title="Cancel this request?" onClose={() => setCancelOpen(false)}>
        <p className="text-[15px] leading-relaxed text-ink-2">Partners will stop preparing offers for {data.reference}. You can always send a new request.</p>
        {actionError && <div className="mt-4"><Notice tone="danger">{actionError.message}</Notice></div>}
        <div className="mt-6 flex flex-col gap-3 pb-2">
          <Button variant="danger" busy={busy} className="w-full" onClick={() => void simple(`/api/mobile/v1/requests/${encodeURIComponent(data.reference)}/cancel`, { reason: 'Cancelled by customer in the app' })}>Cancel request</Button>
          <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(false)}>Keep it</Button>
        </div>
      </Sheet>
    </div>
  );
}
