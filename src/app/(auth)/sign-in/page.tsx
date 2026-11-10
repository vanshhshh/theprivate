import type { Metadata } from 'next';
import { SignInForm } from '@/components/domain/auth-forms';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display mb-3 text-[48px] leading-none">Welcome <em>back</em></h1>
      <p className="mb-12 text-[17px] text-ink-2">Sign in to see your flight requests, offers and trips.</p>
      <SignInForm next={next ?? null} />
    </>
  );
}
