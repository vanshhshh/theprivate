import { Haptics, NotificationType } from '@capacitor/haptics';
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api, ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Field, inputClass, LinkButton, Notice, TopBar } from '@/components/ui';
import { localDate } from '@/lib/format';
import { useOnline } from '@/lib/network';
import { planProblems, resetPlan, toRequestBody, updatePlan, usePlan, usePlanReady } from '@/state/plan';
import { CATEGORIES } from './Plan';

/** Review and submit a flight request (the server's rules apply). A request is never a booking. */
export function RequestFlight() {
  const p = usePlan();
  const navigate = useNavigate();
  const online = useOnline();
  const { state, profile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const submitted = useRef<string | null>(null);
  const ready = usePlanReady();
  if (submitted.current) return <Navigate to={`/journeys/request/${submitted.current}?new=1`} replace />;
  if (!ready) return null;
  if (planProblems(p).length) return <Navigate to="/plan" replace />;

  const signedIn = state.status === 'signed-in';
  const fe = error?.fieldErrors ?? {};
  const legs = [
    { from: p.from!, to: p.to!, date: p.date, time: p.time },
    ...(p.tripType === 'RETURN' ? [{ from: p.to!, to: p.from!, date: p.returnDate, time: p.returnTime }] : []),
  ];

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ reference: string }>('/api/mobile/v1/requests', { method: 'POST', body: toRequestBody(p, { name: name || profile?.name || '', phone }), timeoutMs: 25_000 });
      void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      // Navigate first; the draft is cleared once we have left this screen.
      submitted.current = r.reference;
      navigate(`/journeys/request/${r.reference}?new=1`, { replace: true });
      setTimeout(resetPlan, 0);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-paper">
      <TopBar title="Your flight request" />
      <section className="px-6 pb-2 pt-5">
        <p className="strip text-[11px] uppercase tracking-[0.22em] text-muted">Review</p>
        <ol className="mt-4 space-y-4">
          {legs.map((l, i) => (
            <li key={i} className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="strip text-[22px] leading-none">
                  {l.from.iata ?? l.from.icao} <span className="text-muted">→</span> {l.to.iata ?? l.to.icao}
                </p>
                <p className="mt-1.5 text-[13.5px] text-ink-2">
                  {l.from.city ?? l.from.name} to {l.to.city ?? l.to.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[14px]">{localDate(l.date, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="strip text-[12px] text-muted">{l.time ? `${l.time} local` : 'Flexible time'}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14px] text-ink-2">
          {p.passengers} {p.passengers === 1 ? 'passenger' : 'passengers'} · {CATEGORIES.find(([v]) => v === p.category)?.[1] ?? 'Any'} aircraft ·{' '}
          <Link to="/plan" className="text-sectional underline underline-offset-4">
            Edit
          </Link>
        </p>
      </section>

      <section className="space-y-6 px-6 py-6">
        <Field label="Anything we should know?" error={fe.requirements} hint="Luggage, catering, accessibility, flexible dates…">
          {(id) => <textarea id={id} rows={3} maxLength={2000} value={p.requirements} onChange={(e) => updatePlan({ requirements: e.target.value })} className={`${inputClass} h-auto py-3 leading-relaxed`} />}
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={p.petsOnBoard} onChange={(e) => updatePlan({ petsOnBoard: e.target.checked })} className="size-5 accent-magenta" />
          Pets will travel
        </label>
      </section>

      {!signedIn ? (
        <section className="mx-6 mb-10 rounded-sm bg-night p-6 text-paper">
          <h2 className="font-display text-[24px] leading-tight">Sign in to send your request</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-paper/75">Your journey stays as you planned it. Offers and updates arrive in your account.</p>
          <div className="mt-5 flex flex-col gap-3">
            <LinkButton to="/auth/sign-in?next=/plan/request" variant="light">
              Sign in
            </LinkButton>
            <LinkButton to="/auth/sign-up?next=/plan/request" variant="ghost" className="text-paper decoration-paper/40">
              Create an account
            </LinkButton>
          </div>
        </section>
      ) : (
        <section className="space-y-6 px-6 pb-10">
          <p className="strip text-[11px] uppercase tracking-[0.22em] text-muted">Contact for this journey</p>
          <Field label="Name" error={fe.contactName}>{(id) => <input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />}</Field>
          <Field label="Phone (optional)" error={fe.contactPhone} hint="Partners may call to confirm details.">
            {(id) => <input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={inputClass} />}
          </Field>

          {error && (
            <Notice tone={error.uncertain ? 'warning' : 'danger'}>
              {error.uncertain ? (
                <>
                  We couldn’t confirm whether your request reached us. Please check{' '}
                  <Link to="/journeys" className="underline">
                    My Journeys
                  </Link>{' '}
                  before sending it again.
                </>
              ) : (
                error.message
              )}
            </Notice>
          )}
          {!online && <Notice tone="warning">You’re offline. Your request is saved on this phone; send it when you’re connected.</Notice>}
          <Button onClick={submit} busy={busy} disabled={!online} className="w-full">
            Send request
          </Button>
          <p className="text-center text-[12.5px] leading-relaxed text-muted">This is a request, not a booking. Licensed partners reply with offers you can compare; nothing is charged.</p>
        </section>
      )}
    </div>
  );
}
