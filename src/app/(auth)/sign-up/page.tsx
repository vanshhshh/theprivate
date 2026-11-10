import type { Metadata } from 'next';
import { SignUpForm } from '@/components/domain/auth-forms';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display mb-3 text-[48px] leading-none">Create your <em>account</em></h1>
      <p className="mb-12 text-[17px] text-ink-2">Plan flights, compare offers and keep every trip in one place.</p>
      <SignUpForm next={next ?? null} />
    </>
  );
}
