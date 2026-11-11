import { Share } from '@capacitor/share';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ApiError, apiUrl } from '@/api/client';
import type { Listing, OneWay } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { env } from '@/config/env';
import { Icon } from '@/components/Icon';
import { Button, ErrorState, Field, inputClass, Notice, Section, Sheet, Skeleton, TopBar } from '@/components/ui';
import { instant, money } from '@/lib/format';
import { useApi } from '@/lib/useApi';

/** Shares only the public web page of a public listing. */
function ShareButton({ title, path }: { title: string; path: string }) {
  return (
    <button
      type="button"
      aria-label="Share"
      onClick={() => void Share.share({ title, url: `${env.apiBaseUrl}${path}`, dialogTitle: 'Share' }).catch(() => {})}
      className="grid size-11 place-items-center rounded-full"
    >
      <Icon name="share" className="size-5" />
    </button>
  );
}

function useEnquiry(path: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [sent, setSent] = useState(false);
  const send = async (body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: 'POST', body });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, sent, send };
}

export function OneWayDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state } = useAuth();
  const { data, error, loading, reload } = useApi<OneWay>(`/api/mobile/v1/one-way/${encodeURIComponent(id)}`);
  const [open, setOpen] = useState(false);
  const [pax, setPax] = useState(1);
  const [message, setMessage] = useState('');
  const enq = useEnquiry(`/api/mobile/v1/one-way/${encodeURIComponent(id)}/enquire`);

  if (loading && !data) return (<><TopBar title="One-way offer" /><Skeleton /></>);
  if (error) return (<><TopBar title="One-way offer" /><ErrorState error={error} onRetry={reload} /></>);
  if (!data) return null;
  const fe = enq.error?.fieldErrors ?? {};

  return (
    <div className="min-h-full bg-paper">
      <TopBar title="One-way offer" action={<ShareButton title={`${data.from.code} → ${data.to.code} one-way offer`} path={data.webUrl} />} />
      <section className="bg-night px-6 pb-8 pt-6 text-paper">
        <p className="strip text-[11px] uppercase tracking-[0.22em] text-dusk">One-way offer</p>
        <p className="strip mt-3 text-[40px] leading-none">{data.from.code} <span className="text-paper/50">→</span> {data.to.code}</p>
        <p className="mt-2 text-[15px] text-paper/80">{data.from.city ?? data.from.name} to {data.to.city ?? data.to.name}</p>
        <p className="mt-5 text-[14px] text-paper/80">
          Departs between {instant(data.windowStart, data.from.timezone)} and {instant(data.windowEnd, data.from.timezone)}
        </p>
      </section>
      <Section title="Aircraft">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14.5px]">
          <dt className="text-muted">Type</dt><dd className="text-right">{data.aircraft.type}</dd>
          {data.aircraft.year && (<><dt className="text-muted">Year</dt><dd className="text-right">{data.aircraft.year}</dd></>)}
          <dt className="text-muted">Seats offered</dt><dd className="text-right">{data.seats}</dd>
          <dt className="text-muted">Operated by</dt><dd className="text-right">{data.partner.name}</dd>
          <dt className="text-muted">Price</dt><dd className="strip text-right">{data.price ? money(data.price.amount, data.price.currency) : 'On enquiry'}</dd>
        </dl>
        {data.notes && <p className="mt-5 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{data.notes}</p>}
        <p className="mt-5 text-[12.5px] leading-relaxed text-muted">The aircraft is already flying this route; timing follows the partner’s schedule. An enquiry is not a booking.</p>
      </Section>
      <div className="px-6 pb-12">
        {enq.sent ? (
          <Notice tone="success">Enquiry sent. The partner will respond through ThePrivate; you’ll see it in your inbox.</Notice>
        ) : (
          <Button className="w-full" onClick={() => (state.status === 'signed-in' ? setOpen(true) : navigate(`/auth/sign-in?next=/explore/one-way/${id}`))}>
            Enquire about this flight
          </Button>
        )}
      </div>
      <Sheet open={open && !enq.sent} title="Enquire" onClose={() => setOpen(false)}>
        <div className="space-y-6 pb-4">
          <Field label="Passengers" error={fe.passengers} hint={`Up to ${data.seats}.`}>
            {(fid) => <input id={fid} type="number" inputMode="numeric" min={1} max={data.seats} value={pax} onChange={(e) => setPax(Number(e.target.value))} className={inputClass} />}
          </Field>
          <Field label="Message (optional)" error={fe.message}>
            {(fid) => <textarea id={fid} rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} h-auto py-3`} />}
          </Field>
          {enq.error && <Notice tone="danger">{enq.error.message}</Notice>}
          <Button busy={enq.busy} className="w-full" onClick={() => void enq.send({ passengers: pax, message: message || undefined })}>Send enquiry</Button>
        </div>
      </Sheet>
    </div>
  );
}

const ENQUIRY_TYPES = [
  ['REQUEST_INFO', 'More information'],
  ['VIEWING', 'Arrange a viewing'],
  ['PURCHASE_INTEREST', 'Interested in buying'],
] as const;

export function AircraftDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state, profile } = useAuth();
  const { data, error, loading, reload } = useApi<Listing>(`/api/mobile/v1/aircraft/${encodeURIComponent(id)}`);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('REQUEST_INFO');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [message, setMessage] = useState('');
  const enq = useEnquiry(`/api/mobile/v1/aircraft/${encodeURIComponent(id)}/enquire`);

  if (loading && !data) return (<><TopBar title="Aircraft" /><Skeleton /></>);
  if (error) return (<><TopBar title="Aircraft" /><ErrorState error={error} onRetry={reload} /></>);
  if (!data) return null;
  const fe = enq.error?.fieldErrors ?? {};
  const specs: [string, string | number | null | undefined][] = [
    ['Year', data.year],
    ['Category', data.category.label],
    ['Location', data.location],
    ['Total time', data.totalTimeHours ? `${data.totalTimeHours.toLocaleString()} h` : null],
    ['Landings', data.landings?.toLocaleString()],
    ['Registration', data.registration],
    ['Serial number', data.serialNumber],
  ];

  return (
    <div className="min-h-full bg-paper">
      <TopBar title={`${data.manufacturer} ${data.model}`} action={<ShareButton title={data.headline} path={data.webUrl} />} />
      {data.photos.length > 0 && (
        <div className="flex snap-x snap-mandatory overflow-x-auto bg-night [scrollbar-width:none]">
          {data.photos.map((p, i) => (
            <img key={i} src={apiUrl(p.url)} alt={p.caption ?? data.headline} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" className="aspect-[4/3] w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
      )}
      <section className="px-6 pt-6">
        <p className="strip text-[11px] uppercase tracking-[0.2em] text-muted">{data.category.label}</p>
        <h1 className="font-display mt-2 text-[30px] leading-tight">{data.headline}</h1>
        <p className="strip mt-4 text-[24px]">{data.price ? money(data.price.amount, data.price.currency) : 'Price on request'}</p>
      </section>
      <Section title="Specifications">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14.5px]">
          {specs.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
          ))}
        </dl>
      </Section>
      {data.description && <Section title="About this aircraft"><p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{data.description}</p></Section>}
      <div className="px-6 pb-12">
        {enq.sent ? (
          <Notice tone="success">Enquiry sent. Our sales desk will connect you with the seller.</Notice>
        ) : (
          <Button className="w-full" onClick={() => (state.status === 'signed-in' ? setOpen(true) : navigate(`/auth/sign-in?next=/explore/aircraft/${id}`))}>Enquire</Button>
        )}
        <p className="mt-3 text-center text-[12.5px] text-muted">Enquiries go through ThePrivate’s sales desk; contact details are never shared without consent.</p>
      </div>
      <Sheet open={open && !enq.sent} title="Enquire about this aircraft" onClose={() => setOpen(false)}>
        <div className="space-y-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {ENQUIRY_TYPES.map(([v, l]) => (
              <button key={v} type="button" aria-pressed={type === v} onClick={() => setType(v)} className={`h-10 rounded-full border px-4 text-[14px] ${type === v ? 'border-night bg-night text-paper' : 'border-line-strong text-ink-2'}`}>{l}</button>
            ))}
          </div>
          <Field label="Phone (optional)" error={fe.phone}>{(fid) => <input id={fid} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />}</Field>
          <Field label="Message" error={fe.message} hint="At least 10 characters.">
            {(fid) => <textarea id={fid} rows={4} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} h-auto py-3`} />}
          </Field>
          {enq.error && <Notice tone="danger">{enq.error.message}</Notice>}
          <Button busy={enq.busy} className="w-full" onClick={() => void enq.send({ type, phone: phone || undefined, message })}>Send enquiry</Button>
        </div>
      </Sheet>
    </div>
  );
}
