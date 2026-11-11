import { Browser } from '@capacitor/browser';
import { useState } from 'react';
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
            <Button variant="ghost" className="w-full text-danger decoration-danger/40" onClick={() => setDeleting(true)}>Delete account</Button>
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
          Your request goes to our team, who will confirm by e-mail before anything is deleted. Some records may need to be kept where the law requires it.
        </p>
        <div className="mt-4"><Notice tone="info">Direct deletion from the app is being connected. For now, the request opens our contact page.</Notice></div>
        <div className="mt-6 flex flex-col gap-3 pb-2">
          <Button variant="danger" className="w-full" onClick={() => web('/contact?topic=account-deletion')}>Request deletion</Button>
          <Button variant="ghost" className="w-full" onClick={() => setDeleting(false)}>Keep my account</Button>
        </div>
      </Sheet>
    </>
  );
}
