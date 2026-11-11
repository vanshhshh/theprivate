import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/domain/auth-forms';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

export default function ForgotPassword() {
  return (
    <>
      <h1 className="font-display mb-3 text-[48px] leading-none">Forgotten your <em>password?</em></h1>
      <p className="mb-12 text-[17px] text-ink-2">Enter the e-mail you sign in with and we will send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
