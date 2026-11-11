import { Browser } from '@capacitor/browser';
import { useEffect, useState } from 'react';
import { biometricAvailability, biometricEnabled, setBiometricEnabled } from '@/auth/biometric';
import { disablePush, enablePush, pushPermission } from '@/native/push';
import { api, ApiError } from '@/api/client';
import type { Profile as P } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { env } from '@/config/env';
import { Icon } from '@/components/Icon';
import { PLATES } from '@/components/Plate';
import { ScreenHero } from '@/components/ScreenHero';
import { Button, EmptyState, Field, inputClass, LinkButton, Notice, Section, Sheet, Skeleton } from '@/components/ui';

const CURRENCIES = ['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD'];
const web = (path: string) => void Browser.open({ url: `${env.apiBaseUrl}${path}` });

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between text-left text-[15px]">
        {label} <Icon name="chevron-right" className="size-5 text-muted" />
      </button>
    </li>
  );
}

/** Face ID / fingerprint lock for this device (only shown where the device supports it). */
function AppLock() {
  const [avail, setAvail] = useState<{ available: boolean; label: string } | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void biometricAvailability().then(setAvail);
    void biometricEnabled().then(setOn);
  }, []);
  if (!avail?.available) return null;
  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await setBiometricEnabled(!on);
      setOn(!on);
    } catch {
      setError('Not changed: we could not confirm it’s you.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Security">
      <div className="flex min-h-14 items-center justify-between gap-4">
        <div>
          <p className="text-[15px]">Lock with {avail.label}</p>
          <p className="text-[12.5px] text-muted">Asked when you open the app and after 5 minutes away.</p>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-label={`Lock with ${avail.label}`} disabled={busy} onClick={() => void toggle()} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-verified' : 'bg-line-strong'}`}>
          <span className={`absolute top-1 size-6 rounded-full bg-paper shadow transition-[left] ${on ? 'left-7' : 'left-1'}`} />
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] text-danger">{error}</p>}
    </Section>
  );
}

/** Push on/off for this phone (shown once push is configured for the build). */
function PushSetting() {
  const [p, setP] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('unavailable');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void pushPermission().then(setP);
  }, []);
  if (p === 'unavailable') return null;
  return (
    <Section title="Notifications">
      {p === 'denied' ? (
        <p className="text-[14.5px] leading-relaxed text-ink-2">Notifications are turned off for ThePrivate in your phone’s settings. Turn them on there to hear about offers and trip changes.</p>
      ) : (
        <div className="flex min-h-14 items-center justify-between gap-4">
          <div>
            <p className="text-[15px]">Offer and trip updates</p>
            <p className="text-[12.5px] text-muted">Lock-screen messages never show routes or prices.</p>
          </div>
          <Button
            variant="secondary"
            busy={busy}
            className="h-11 px-5"
            onClick={() => {
              setBusy(true);
              void (p === 'granted' ? disablePush().then(() => setP('prompt')) : enablePush().then(async () => setP(await pushPermission()))).finally(() => setBusy(false));
            }}
          >
            {p === 'granted' ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
      )}
    </Section>
  );
}

function EditProfile({ profile, onSaved, onClose }: { profile: P; onSaved: (p: P) => void; onClose: () => void }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [currency, setCurrency] = useState(profile.preferredCurrency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const timezone = profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const p = await api<P>('/api/mobile/v1/me', { method: 'PATCH', body: { name, phone, preferredCurrency: currency, timezone, companyName: profile.companyName ?? '', marketingOptIn: profile.marketingOptIn } });
      onSaved(p);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
    } finally {
      setBusy(false);
    }
  };
  const fe = error?.fieldErrors ?? {};
  return (
    <div className="space-y-6 pb-4">
      <Field label="Full name" error={fe.name}>{(id) => <input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />}</Field>
      <Field label="Phone" error={fe.phone}>{(id) => <input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={inputClass} />}</Field>
      <Field label="Preferred currency" error={fe.preferredCurrency}>
        {(id) => (
          <select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </Field>
      {error && <Notice tone="danger">{error.message}</Notice>}
      <Button busy={busy} className="w-full" onClick={() => void save()}>Save</Button>
    </div>
  );
}

export function Profile() {
  const { state, profile, signOut, setProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<ApiError | null>(null);

  const requestDeletion = async () => {
    setDelBusy(true);
    setDelError(null);
    try {
      await api('/api/mobile/v1/me/deletion', { method: 'POST', body: { confirm: true, reason: reason.trim() || undefined } });
      setDeleting(false);
      await signOut(); // the request is recorded; this device is signed out
    } catch (e) {
      setDelError(e instanceof ApiError ? e : new ApiError('UNKNOWN', 'Something went wrong.', 0));
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <>
      <ScreenHero plate={PLATES.skyHorizon} eyebrow="Profile" title={profile ? profile.name : 'Your account'}>
        {profile && <p className="mt-2 text-[14px] text-paper/70">{profile.email}</p>}
      </ScreenHero>

      {state.status === 'restoring' && <Skeleton />}
      {state.status === 'signed-out' && (
        <EmptyState title="Sign in to ThePrivate" action={<div className="flex w-full max-w-xs flex-col gap-3"><LinkButton to="/auth/sign-in?next=/profile">Sign in</LinkButton><LinkButton to="/auth/sign-up?next=/profile" variant="secondary">Create an account</LinkButton></div>}>
          Keep your requests, offers and trips in one place.
        </EmptyState>
      )}

      {profile && (
        <>
          <Section title="Account">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14.5px]">
              <dt className="text-muted">Phone</dt><dd className="text-right">{profile.phone ?? '—'}</dd>
              <dt className="text-muted">Currency</dt><dd className="text-right">{profile.preferredCurrency}</dd>
              <dt className="text-muted">Time zone</dt><dd className="text-right">{profile.timezone ?? 'Device default'}</dd>
            </dl>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => setEditing(true)}>Edit details</Button>
          </Section>
          <PushSetting />
          <AppLock />
          {profile.isPartner && (
            <Section title="Flight partner">
              <p className="text-[14.5px] leading-relaxed text-ink-2">Your company workspace is on the website.</p>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => web('/operator')}>Open company workspace</Button>
            </Section>
          )}
        </>
      )}

      <Section title="Help & legal">
        <ul className="divide-y divide-line border-y border-line">
          <Row label="Contact support" onClick={() => web('/contact')} />
          <Row label="Privacy policy" onClick={() => web('/legal/privacy')} />
          <Row label="Terms" onClick={() => web('/legal/terms')} />
          <Row label="Photography credits" onClick={() => web('/legal/media-credits')} />
          <Row label="Are you a flight partner?" onClick={() => web('/for-operators')} />
        </ul>
      </Section>

      {profile && (
        <Section>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" className="w-full" onClick={() => void signOut()}>Sign out</Button>
            {profile.deletionRequestedAt ? (
              <Notice tone="info">You asked for your account to be deleted on {new Date(profile.deletionRequestedAt).toLocaleDateString()}. Our team will confirm by e-mail once it is complete.</Notice>
            ) : (
              <Button variant="ghost" className="w-full text-danger decoration-danger/40" onClick={() => (setDelError(null), setConfirmDelete(false), setDeleting(true))}>Delete account</Button>
            )}
          </div>
        </Section>
      )}
      <p className="strip px-6 pb-10 text-[11px] text-muted">ThePrivate v{env.version} · {env.name}</p>

      {profile && (
        <Sheet open={editing} title="Your details" onClose={() => setEditing(false)}>
          <EditProfile profile={profile} onSaved={setProfile} onClose={() => setEditing(false)} />
        </Sheet>
      )}
      <Sheet open={deleting} title="Delete your account" onClose={() => setDeleting(false)}>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Your request goes to our team, who will confirm by e-mail before anything is deleted. Some records may need to be kept where the law requires it. You will be signed out of this device.
        </p>
        <div className="mt-5">
          <Field label="Reason (optional)">{(id) => <input id={id} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} className={inputClass} />}</Field>
        </div>
        <label className="mt-5 flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={confirmDelete} onChange={(e) => setConfirmDelete(e.target.checked)} className="size-5 accent-magenta" />
          I want my ThePrivate account deleted.
        </label>
        {delError && <div className="mt-4"><Notice tone="danger">{delError.message}</Notice></div>}
        <div className="mt-6 flex flex-col gap-3 pb-2">
          <Button variant="danger" busy={delBusy} disabled={!confirmDelete} className="w-full" onClick={() => void requestDeletion()}>Request deletion</Button>
          <Button variant="ghost" className="w-full" onClick={() => setDeleting(false)}>Keep my account</Button>
        </div>
      </Sheet>
    </>
  );
}
