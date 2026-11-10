import type { Metadata } from 'next';
import { Notice, PageHeader } from '@/components/ui/display';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-12 md:px-8">
      <PageHeader eyebrow="Legal" title="Privacy policy" />
      <Notice tone="warning" title="Draft pending legal review">
        This draft describes how the platform currently handles personal data. It must be reviewed by counsel for compliance with India’s Digital Personal Data Protection Act 2023, UAE PDPL and any other applicable law before launch.
      </Notice>
      <div className="mt-10 space-y-6 leading-relaxed text-ink-2 [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-ink">
        <h2>What we collect</h2>
        <p>Account details (name, e-mail, phone), trip requests and passenger counts, messages, listing information and uploaded documents. We do not store payment card details.</p>
        <h2>How we use it</h2>
        <p>To route your request to suitable operators, to manage quotes and bookings, to review listings, and to contact you about your account. Your phone number and identity are shared with an operator only after you accept their quote.</p>
        <h2>Operator business contacts</h2>
        <p>We maintain business contact information for licensed operators compiled from public regulatory and company sources. It is used only to contact operators about joining ThePrivate, is access-restricted, and is never published. Operators can ask us to correct or remove it.</p>
        <h2>Security</h2>
        <p>Data is stored in access-controlled systems. Documents are private by default and served only to authorised users. Staff access is role-based and audited.</p>
        <h2>Your rights</h2>
        <p>You can request access, correction or deletion of your personal data by writing to us through the contact page.</p>
      </div>
    </div>
  );
}
