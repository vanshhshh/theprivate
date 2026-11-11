import { Browser } from '@capacitor/browser';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError, authCall } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { env } from '@/config/env';
import { Plate, PLATES } from '@/components/Plate';
import { Button, Field, inputClass, Notice, Sheet, TopBar } from '@/components/ui';

/** Only in-app paths may be used as a return destination. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/journeys';
}

function AuthFrame({ title, eyebrow, children }: { title: React.ReactNode; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-paper">
      <section className="relative isolate h-[30svh] overflow-hidden bg-night text-paper">
        <Plate plate={PLATES.cabinWarm} priority />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-night via-night/50 to-night/30" />
        <div className="absolute inset-x-0 top-0">
          <TopBar tone="night" />
        </div>
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <p className="strip mb-2 text-[11px] uppercase tracking-[0.22em] text-dusk">{eyebrow}</p>
          <h1 className="font-display text-[36px] leading-none">{title}</h1>
        </div>
      </section>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}

/** Sends a reset link; the new password is chosen on theprivate.in, then the customer signs in here. */
function ForgotPassword({ open, onClose, initialEmail }: { open: boolean; onClose: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await authCall('/request-password-reset', { email: email.trim().toLowerCase(), redirectTo: '/reset-password' });
      setSent(true);
    } catch (e) {
      const a = e instanceof ApiError ? e : null;
      if (a?.status === 429) setError('Too many attempts. Please wait a minute and try again.');
      else if (a?.code === 'NETWORK') setError(a.message);
      else setSent(true); // never reveal whether an account exists
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} title="Reset your password" onClose={onClose}>
      {sent ? (
        <div className="pb-4">
          <p className="text-[15px] leading-relaxed text-ink-2">If an account exists for <strong>{email}</strong>, we have sent a link to choose a new password. It works once and expires in one hour. Then come back here and sign in.</p>
          <Button className="mt-6 w-full" onClick={onClose}>Back to sign in</Button>
        </div>
      ) : (
        <div className="space-y-6 pb-4">
          <Field label="E-mail">{(id) => <input id={id} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />}</Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button busy={busy} disabled={!email.includes('@')} className="w-full" onClick={() => void send()}>Send reset link</Button>
        </div>
      )}
    </Sheet>
  );
}

export function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(safeNext(sp.get('next')), { replace: true });
    } catch (err) {
      const a = err instanceof ApiError ? err : null;
      setError(
        a?.status === 403
          ? 'Please confirm your e-mail address first. We have sent you a new confirmation link.'
          : a?.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : a?.status === 401 || a?.status === 400
              ? 'E-mail or password is incorrect.'
              : (a?.message ?? 'We could not sign you in.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame eyebrow="Welcome back" title={<>Sign <em>in</em></>}>
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="E-mail">{(id) => <input id={id} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />}</Field>
        <Field label="Password">{(id) => <input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />}</Field>
        <Button type="submit" busy={busy} disabled={!email || !password} className="mt-2 w-full">
          Sign in
        </Button>
        <button type="button" onClick={() => setForgot(true)} className="text-left text-[14px] text-sectional underline underline-offset-4">
          Forgotten your password?
        </button>
        <p className="text-[14px] text-ink-2">
          New to ThePrivate?{' '}
          <Link to={`/auth/sign-up?next=${encodeURIComponent(safeNext(sp.get('next')))}`} replace className="text-sectional underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </form>
      <ForgotPassword open={forgot} onClose={() => setForgot(false)} initialEmail={email} />
    </AuthFrame>
  );
}

export function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verify, setVerify] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 10) return setError('Use at least 10 characters for your password.');
    if (!terms) return setError('Please accept the terms and privacy policy.');
    setBusy(true);
    setError(null);
    try {
      const r = await signUp(name, email, password);
      if (r === 'verify') setVerify(true);
      else navigate(safeNext(sp.get('next')), { replace: true });
    } catch (err) {
      const a = err instanceof ApiError ? err : null;
      setError(a?.code === 'USER_ALREADY_EXISTS' || a?.status === 422 ? 'An account with this e-mail already exists.' : a?.status === 429 ? 'Too many attempts. Try again later.' : (a?.message ?? 'Could not create the account.'));
    } finally {
      setBusy(false);
    }
  };

  if (verify) {
    return (
      <AuthFrame eyebrow="One more step" title={<>Check your <em>inbox</em></>}>
        <p className="text-[15px] leading-relaxed text-ink-2">
          We have sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account, then come back and sign in. It expires in 24 hours.
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate(`/auth/sign-in?next=${encodeURIComponent(safeNext(sp.get('next')))}`, { replace: true })}>
          I’ve confirmed, sign in
        </Button>
      </AuthFrame>
    );
  }

  const open = (path: string) => void Browser.open({ url: `${env.apiBaseUrl}${path}` });
  return (
    <AuthFrame eyebrow="ThePrivate" title={<>Create your <em>account</em></>}>
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="Full name">{(id) => <input id={id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />}</Field>
        <Field label="E-mail">{(id) => <input id={id} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />}</Field>
        <Field label="Password" hint="At least 10 characters.">{(id) => <input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />}</Field>
        <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-2">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 size-5 accent-magenta" />
          <span>
            I agree to the{' '}
            <button type="button" onClick={() => open('/legal/terms')} className="underline">
              terms
            </button>{' '}
            and{' '}
            <button type="button" onClick={() => open('/legal/privacy')} className="underline">
              privacy policy
            </button>
            .
          </span>
        </label>
        <Button type="submit" busy={busy} disabled={!name || !email || !password} className="w-full">
          Create account
        </Button>
        <p className="text-[14px] text-ink-2">
          Already have an account?{' '}
          <Link to={`/auth/sign-in?next=${encodeURIComponent(safeNext(sp.get('next')))}`} replace className="text-sectional underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}
