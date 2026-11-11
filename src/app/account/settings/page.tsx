import { PageHeader } from '@/components/ui/display';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { requireViewerPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { getProfile } from '@/server/services/account';
import { requestDeletionAction, saveSettingsAction } from '../actions';

export const metadata = { title: 'Settings' };

const ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Paris', 'America/New_York', 'UTC'];

export default async function Settings() {
  const v = await requireViewerPage('/account/settings');
  const [p, profile] = await Promise.all([prisma.customerProfile.findUnique({ where: { userId: v.user.id } }), getProfile(v)]);
  return (
    <>
      <PageHeader eyebrow="Your journeys" title="Settings" />
      <ActionForm action={saveSettingsAction} className="grid max-w-3xl gap-7 md:grid-cols-2">
        <Field name="name" label="Full name">
          <Input name="name" defaultValue={v.user.name} required />
        </Field>
        <Field name="email" label="E-mail" hint="Contact support to change your sign-in e-mail.">
          <Input name="email" defaultValue={v.user.email} disabled />
        </Field>
        <Field name="phone" label="Phone">
          <Input name="phone" type="tel" defaultValue={v.user.phone ?? ''} />
        </Field>
        <Field name="companyName" label="Company (optional)">
          <Input name="companyName" defaultValue={p?.companyName ?? ''} />
        </Field>
        <Field name="preferredCurrency" label="Preferred currency">
          <Select name="preferredCurrency" defaultValue={p?.preferredCurrency ?? 'INR'}>
            {['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field name="timezone" label="Your timezone" hint="Used to show times in your inbox and trips.">
          <Select name="timezone" defaultValue={v.user.timezone}>
            {ZONES.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Checkbox name="marketingOptIn" value="true" defaultChecked={p?.marketingOptIn} label="Send me occasional news about one-way offers and new routes." />
        </div>
        <div className="md:col-span-2">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </ActionForm>

      <section className="mt-16 max-w-3xl border-t border-line pt-10">
        <h2 className="font-display text-[28px]">Delete your account</h2>
        {profile.deletionRequestedAt ? (
          <p className="mt-3 text-[15px] text-ink-2">
            You asked for your account to be deleted on {new Date(profile.deletionRequestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Our team will confirm by e-mail once it is complete.
          </p>
        ) : (
          <ActionForm action={requestDeletionAction} className="mt-4 grid gap-5">
            <p className="text-[15px] leading-relaxed text-ink-2">Your request goes to our team, who confirm by e-mail before anything is deleted. Some records may need to be kept where the law requires it.</p>
            <Field name="reason" label="Reason (optional)">
              <Input name="reason" maxLength={1000} />
            </Field>
            <Checkbox name="confirm" value="yes" label="I want my ThePrivate account deleted." />
            <div>
              <SubmitButton variant="danger">Request deletion</SubmitButton>
            </div>
          </ActionForm>
        )}
      </section>
    </>
  );
}
