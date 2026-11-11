import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to ask ThePrivate to delete your account, from the app or the website.',
};

/**
 * Public account-deletion instructions (required by Google Play and referenced in the App Store
 * listing). Works without the app. The request itself is made while signed in, so nobody can ask
 * to delete someone else's account.
 */
export default function DeleteAccount() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 md:py-28">
      <p className="strip mb-5 text-[11px] uppercase tracking-[0.22em] text-muted">Your account</p>
      <h1 className="font-display text-[44px] leading-[1.02] md:text-[60px]">Delete your <em>account</em></h1>
      <p className="mt-6 text-[17px] leading-relaxed text-ink-2">You can ask us to delete your ThePrivate account at any time, from the app or from this website.</p>

      <h2 className="font-display mt-12 text-[28px]">In the app</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">Open <strong>Profile</strong>, choose <strong>Delete account</strong>, confirm, and send the request.</p>

      <h2 className="font-display mt-10 text-[28px]">On the website</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
        <Link href="/sign-in?next=/account/settings" className="text-sectional underline underline-offset-4">Sign in</Link>, open <strong>Settings</strong>, and use <strong>Delete your account</strong> at the bottom of the page.
      </p>

      <h2 className="font-display mt-10 text-[28px]">If you can’t sign in</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
        <Link href="/forgot-password" className="text-sectional underline underline-offset-4">Reset your password</Link> first, or{' '}
        <Link href="/contact" className="text-sectional underline underline-offset-4">contact us</Link> from the e-mail address on your account so we can verify that the request is yours.
      </p>

      <h2 className="font-display mt-10 text-[28px]">What happens next</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
        We confirm your request by e-mail, verify it, and confirm again once your account is deleted. Some records may need to be kept where the law requires it; our{' '}
        <Link href="/legal/privacy" className="text-sectional underline underline-offset-4">privacy policy</Link> explains how we handle your information.
      </p>
    </article>
  );
}
