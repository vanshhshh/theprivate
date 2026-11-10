import { Notice, PageHeader, SectionTitle } from '@/components/ui/display';
import { ActionForm, Field, SubmitButton, Textarea } from '@/components/ui/form';
import { requirePermissionPage } from '@/server/auth/viewer';
import { getSetting, SETTING_KEYS } from '@/server/settings';
import { settingAction } from '../actions';

export const metadata = { title: 'Settings' };

const HELP: Record<string, string> = {
  'tax.charterBps': 'Tax on charter by departure country, in basis points (1800 = 18 %). null = not configured: quotes show “excl. taxes”. Set only on advice from your tax adviser.',
  'quote.defaultValidityHours': 'Default quote validity suggested to operators.',
  'rfq.expiryHours': 'Requests close after this many hours (or at first departure, whichever is sooner).',
  'payments.mode': '"pre-payment": settlement is arranged offline and recorded by staff with evidence. Provider modes need credentials and approval.',
};

const INTEGRATIONS: [string, string, boolean][] = [
  ['E-mail delivery', 'EMAIL_PROVIDER / EMAIL_API_KEY', Boolean(process.env.EMAIL_PROVIDER && process.env.EMAIL_API_KEY)],
  ['SMS', 'SMS_PROVIDER / SMS_API_KEY', Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY)],
  ['WhatsApp', 'WHATSAPP_PROVIDER / WHATSAPP_API_KEY', Boolean(process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_API_KEY)],
  ['Payments', 'PAYMENTS_MODE + provider keys', false],
  ['Object storage (S3)', 'STORAGE_DRIVER=s3 + S3_*', process.env.STORAGE_DRIVER === 's3'],
  ['Error monitoring', 'SENTRY_DSN', Boolean(process.env.SENTRY_DSN)],
];

export default async function Settings() {
  await requirePermissionPage('settings.manage', '/admin/settings');
  const values = await Promise.all(SETTING_KEYS.map(async (k) => [k, await getSetting(k)] as const));
  return (
    <>
      <PageHeader eyebrow="Platform" title="Settings" />
      <section className="mb-14">
        <SectionTitle>Integrations</SectionTitle>
        <ul className="divide-y divide-line">
          {INTEGRATIONS.map(([name, env, ok]) => (
            <li key={name} className="flex justify-between py-2.5 text-sm"><span>{name} <span className="strip text-xs text-muted">{env}</span></span><span className={ok ? 'text-verified' : 'text-muted'}>{ok ? 'Configured' : 'Not configured'}</span></li>
          ))}
        </ul>
        <div className="mt-4"><Notice>Unconfigured channels are recorded as “skipped (not configured)”. The platform never reports a message or payment as sent when it was not.</Notice></div>
      </section>
      <section>
        <SectionTitle>Commercial settings</SectionTitle>
        <div className="flex flex-col gap-10">
          {values.map(([key, value]) => (
            <ActionForm key={key} action={settingAction} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="key" value={key} />
              <Field name="value" label={key} hint={HELP[key]}><Textarea name="value" rows={2} defaultValue={JSON.stringify(value)} className="strip text-sm" /></Field>
              <SubmitButton variant="secondary">Save</SubmitButton>
            </ActionForm>
          ))}
        </div>
      </section>
    </>
  );
}
