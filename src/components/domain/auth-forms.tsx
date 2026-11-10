'use client';

import { createAuthClient } from 'better-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { fieldControl, fieldLabel } from '@/components/ui/styles';

const authClient = createAuthClient();

const input = fieldControl;
const label = fieldLabel;

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

export function SignInForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        const { error } = await authClient.signIn.email({ email: String(fd.get('email')), password: String(fd.get('password')) });
        setPending(false);
        if (error) {
          setError(error.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'E-mail or password is incorrect.');
          return;
        }
        router.push(safeNext(next));
        router.refresh();
      }}
    >
      {error && <p role="alert" className="rounded-sm border-l-2 border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="group flex flex-col gap-1">
        <label htmlFor="email" className={label}>E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div className="group flex flex-col gap-1">
        <label htmlFor="password" className={label}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass('primary', 'lg', 'mt-2 w-full')}>{pending ? 'Signing in…' : 'Sign in'}</button>
      <p className="text-sm text-muted">
        New to ThePrivate? <Link className="text-sectional underline underline-offset-4" href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const password = String(fd.get('password'));
        if (password.length < 10) return setError('Use at least 10 characters for your password.');
        if (!fd.get('terms')) return setError('Please accept the terms and privacy policy.');
        setPending(true);
        setError(null);
        const { error } = await authClient.signUp.email({ name: String(fd.get('name')).trim(), email: String(fd.get('email')).trim(), password });
        setPending(false);
        if (error) {
          setError(error.code === 'USER_ALREADY_EXISTS' || error.status === 422 ? 'An account with this e-mail already exists.' : error.status === 429 ? 'Too many attempts. Try again later.' : error.message ?? 'Could not create the account.');
          return;
        }
        router.push(safeNext(next));
        router.refresh();
      }}
    >
      {error && <p role="alert" className="rounded-sm border-l-2 border-danger bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="group flex flex-col gap-1">
        <label htmlFor="name" className={label}>Full name</label>
        <input id="name" name="name" autoComplete="name" required minLength={2} className={input} />
      </div>
      <div className="group flex flex-col gap-1">
        <label htmlFor="email" className={label}>E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={input} />
      </div>
      <div className="group flex flex-col gap-1">
        <label htmlFor="password" className={label}>Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className={input} />
        <p className="text-xs text-muted">At least 10 characters.</p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-magenta" />
        <span>
          I agree to the <Link href="/legal/terms" className="underline">terms</Link> and <Link href="/legal/privacy" className="underline">privacy policy</Link>.
        </span>
      </label>
      <button type="submit" disabled={pending} className={buttonClass('primary', 'lg', 'mt-2 w-full')}>{pending ? 'Creating account…' : 'Create account'}</button>
      <p className="text-sm text-muted">
        Already have an account? <Link className="text-sectional underline underline-offset-4" href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</Link>
      </p>
    </form>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className ?? 'text-sm text-muted hover:text-ink'}
      onClick={async () => {
        await authClient.signOut();
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
