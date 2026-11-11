import type { Metadata } from 'next';
import { SignInForm } from '@/components/domain/auth-forms';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  return (
    <>
      <h1 className="font-display mb-3 text-[48px] leading-none">Welcome <em>back</em></h1>
      <p className="mb-12 text-[17px] text-ink-2">Sign in to see your flight requests, offers and trips.</p>
      {reset && <p role="status" className="mb-8 rounded-sm border-l-2 border-verified bg-verified-bg px-4 py-3 text-sm">Your password has been changed. Please sign in with the new one.</p>}
      <SignInForm next={next ?? null} />
    </>
  );
}
