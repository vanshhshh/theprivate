import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/domain/auth-forms';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

/** Better Auth redirects here from the e-mailed link with ?token=... (or ?error=INVALID_TOKEN). */
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const valid = Boolean(token && /^[A-Za-z0-9_-]{16,200}$/.test(token) && !error);
  return (
    <>
      <h1 className="font-display mb-3 text-[48px] leading-none">Choose a new <em>password</em></h1>
      {valid && token ? (
        <>
          <p className="mb-12 text-[17px] text-ink-2">Then sign in again on the website or in the app.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="text-[17px] text-ink-2">
          This reset link is invalid or has expired. <Link href="/forgot-password" className="text-sectional underline underline-offset-4">Ask for a new one</Link>.
        </p>
      )}
    </>
  );
}
