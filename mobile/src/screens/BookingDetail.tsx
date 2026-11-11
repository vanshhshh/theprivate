import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api, ApiError } from '@/api/client';
import type { Booking } from '@/api/types';
import { Button, ErrorState, Notice, Section, Sheet, Skeleton, StatusChip, TopBar } from '@/components/ui';
import { instant, localDate, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

// Mirrors PaymentStatus. Only SETTLED means verified (set by a verified provider event or audited settlement).
const PAYMENT: Record<string, string> = { CREATED: 'Payment requested', AUTHORIZED: 'Authorised · not yet settled', SETTLED: 'Payment verified', FAILED: 'Payment failed', REFUNDED: 'Refunded' };

/** A booking's itinerary in the departure airports' local times, with its true status. */
export function BookingDetail() {
  const { ref = '' } = useParams();
  const [sp] = useSearchParams();
  const { data, error, loading, reload } = useApi<Booking>(`/api/mobile/v1/bookings/${encodeURIComponent(ref)}`);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  if (loading && !data) return (<><TopBar title={ref} /><Skeleton /></>);
  if (error) return (<><TopBar title={ref} /><ErrorState error={error} onRetry={reload} /></>);
  if (!data) return null;
  const cancellable = ['PENDING_OPERATOR_CONFIRMATION', 'CONFIRMED', 'PAYMENT_PENDING'].includes(data.status.value);

  const cancel = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/api/mobile/v1/bookings/${encodeURIComponent(data.reference)}/cancel`, { method: 'POST', body: { reason: 'Cancelled by customer in the app' } });
      setCancelOpen(false);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-paper">
      <TopBar title={`Booking ${data.reference}`} />
      {sp.get('new') && <div className="px-6 pt-4"><Notice tone="success">Offer accepted. {data.partner.name} will now confirm the aircraft and crew. Nothing has been charged.</Notice></div>}

      <section className="bg-night px-6 pb-7 pt-6 text-paper">
        <StatusChip status={data.status} />
        {data.nextStep && <p className="mt-3 text-[14.5px] leading-relaxed text-paper/80">{data.nextStep}</p>}
        <ol className="mt-6 space-y-6">
          {data.legs.map((l, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="strip text-[30px] leading-none">{l.from.code}</p>
                <p className="mt-1 truncate text-[12.5px] text-paper/65">{l.from.city ?? l.from.name}</p>
              </div>
              <span aria-hidden className="h-px w-10 bg-dusk/70" />
              <div className="text-right">
                <p className="strip text-[30px] leading-none">{l.to.code}</p>
                <p className="mt-1 truncate text-[12.5px] text-paper/65">{l.to.city ?? l.to.name}</p>
              </div>
              <p className="col-span-3 text-[13.5px] text-paper/80">
                {localDate(l.date)} · {l.time ? `${l.time} local time` : 'Departure time to be confirmed'}
                {l.from.timezone ? ` (${l.from.timezone.replace('_', ' ')})` : ''}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Section title="Flight">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14.5px]">
          <dt className="text-muted">Aircraft</dt><dd className="text-right">{data.aircraft.type}</dd>
          <dt className="text-muted">Operated by</dt><dd className="text-right">{data.partner.name}</dd>
          <dt className="text-muted">Passengers</dt><dd className="text-right">{data.passengers}</dd>
          <dt className="text-muted">Request</dt><dd className="text-right"><Link to={`/journeys/request/${data.request}`} className="strip text-sectional underline">{data.request}</Link></dd>
        </dl>
      </Section>

      {data.price && (
        <Section title="Price">
          <p className="strip text-[28px] leading-none">{money(data.price.amount, data.price.currency)}</p>
          <p className="mt-1.5 text-[13px] text-muted">Including {money(data.price.taxes, data.price.currency)} taxes and fees</p>
          {data.payments.length > 0 ? (
            <ul className="mt-4 divide-y divide-line border-y border-line text-[14px]">
              {data.payments.map((p, i) => (
                <li key={i} className="flex justify-between py-3"><span>{PAYMENT[p.status] ?? p.status}</span><span className="strip">{money(p.amount, p.currency)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[14px] text-ink-2">No payment has been taken.</p>
          )}
          {data.price.terms && <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{data.price.terms}</p>}
        </Section>
      )}

      {data.timeline.length > 0 && (
        <Section title="Updates">
          <ol className="space-y-3">
            {data.timeline.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-4 text-[14px]"><span>{t.status.label}</span><span className="strip text-[12px] text-muted">{instant(t.at)}</span></li>
            ))}
          </ol>
        </Section>
      )}

      {cancellable && (
        <div className="px-6 pb-12">
          <Button variant="danger" className="w-full" onClick={() => (setActionError(null), setCancelOpen(true))}>Cancel booking</Button>
        </div>
      )}

      <Sheet open={cancelOpen} title="Cancel this booking?" onClose={() => setCancelOpen(false)}>
        <p className="text-[15px] leading-relaxed text-ink-2">The partner’s cancellation conditions apply as stated in the offer. Our team will contact you about anything that follows.</p>
        {actionError && <div className="mt-4"><Notice tone="danger">{actionError.message}</Notice></div>}
        <div className="mt-6 flex flex-col gap-3 pb-2">
          <Button variant="danger" busy={busy} className="w-full" onClick={() => void cancel()}>Cancel booking</Button>
          <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(false)}>Keep it</Button>
        </div>
      </Sheet>
    </div>
  );
}
