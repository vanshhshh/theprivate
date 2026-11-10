import { feeBlockers, formatMinor } from '@/domain/payments/onboarding';
import { Notice, PageHeader, Pill, SectionTitle } from '@/components/ui/display';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { InlineAction } from '@/components/ui/inline-action';
import { requirePermissionPage } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { liveCollectionApproved, onboardingProvider } from '@/server/payments/onboarding/providers';
import { feeConfig } from '@/server/payments/onboarding/service';
import { reconcileAction, refundAction, saveFeeConfigAction } from './actions';

export const metadata = { title: 'Onboarding fees' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPayments() {
  const viewer = await requirePermissionPage('onboarding_payment.read', '/admin/onboarding-payments');
  const canManage = viewer.permissions.has('onboarding_payment.manage');
  const [cfg, payments] = await Promise.all([
    feeConfig(),
    prisma.onboardingPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { operator: { select: { displayName: true, countryCode: true, lifecycle: true } }, events: { orderBy: { createdAt: 'asc' } } } }),
  ]);
  const provider = onboardingProvider();
  const blockers = feeBlockers(cfg);

  return (
    <>
      <PageHeader eyebrow="Finance" title="Company onboarding fees" lede="One-time fee paid by companies at the end of onboarding. Separate from charter payments. Payment never verifies or activates a company." />

      <div className="mb-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-sm bg-paper-2 p-5 text-[14px]"><p className="text-muted">Collection</p><p className="mt-1">{blockers.length ? <Pill tone="unconfirmed">Off</Pill> : <Pill tone="verified">Configured</Pill>}</p><p className="mt-2 text-muted">{blockers.join(' ') || `${cfg.amountMinor ? formatMinor(cfg.amountMinor, cfg.currency) : ''} + ${(cfg.taxRateBps ?? 0) / 100}% ${cfg.taxLabel ?? 'tax'}`}</p></div>
        <div className="rounded-sm bg-paper-2 p-5 text-[14px]"><p className="text-muted">Provider</p><p className="strip mt-1 text-lg">{provider?.name ?? 'none'}</p><p className="mt-2 text-muted">{provider?.name === 'sandbox' ? 'Development sandbox (no real money; refused in production).' : provider ? (liveCollectionApproved() ? 'Live collection approved.' : 'Live collection NOT approved (ONBOARDING_PAYMENTS_LIVE).') : 'Set ONBOARDING_PAYMENT_PROVIDER and credentials.'}</p></div>
        <div className="rounded-sm bg-paper-2 p-5 text-[14px]"><p className="text-muted">Paid</p><p className="strip mt-1 text-lg">{payments.filter((p) => p.status === 'PAID').length}</p><p className="mt-2 text-muted">{payments.filter((p) => p.status === 'PAYMENT_FAILED').length} failed · {payments.filter((p) => p.status === 'REFUNDED').length} refunded</p></div>
      </div>

      <section className="mb-14">
        <SectionTitle>Fee configuration</SectionTitle>
        {!canManage ? (
          <Notice tone="info">Changing the fee requires the onboarding_payment.manage permission.</Notice>
        ) : (
          <ActionForm action={saveFeeConfigAction} className="grid max-w-3xl gap-6 md:grid-cols-2">
            <div className="md:col-span-2"><Checkbox name="enabled" defaultChecked={cfg.enabled} label="Collect the onboarding fee (requires amount, tax treatment and refund policy)" /></div>
            <Field name="currency" label="Currency"><Select name="currency" defaultValue={cfg.currency}>{['INR', 'AED', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field name="amount" label="Fee (before tax)" hint="Major units, e.g. 25000 or 25000.00"><Input name="amount" inputMode="decimal" defaultValue={cfg.amountMinor ? (cfg.amountMinor / 100).toFixed(2) : ''} className="strip" /></Field>
            <Field name="taxRate" label="Tax rate (%)" hint="0 if no tax applies; empty = not decided"><Input name="taxRate" inputMode="decimal" defaultValue={cfg.taxRateBps === null ? '' : String(cfg.taxRateBps / 100)} className="strip" /></Field>
            <Field name="taxLabel" label="Tax label" hint="e.g. GST, VAT"><Input name="taxLabel" defaultValue={cfg.taxLabel ?? ''} /></Field>
            <Field name="coverage" label="What the fee covers" className="md:col-span-2"><Textarea name="coverage" rows={3} defaultValue={cfg.coverage ?? ''} /></Field>
            <Field name="refundPolicy" label="Refund and cancellation policy" className="md:col-span-2" hint="Shown to companies before they pay. Must be approved by ThePrivate."><Textarea name="refundPolicy" rows={4} defaultValue={cfg.refundPolicy ?? ''} /></Field>
            <div className="md:col-span-2"><SubmitButton>Save configuration</SubmitButton></div>
          </ActionForm>
        )}
      </section>

      <SectionTitle>Payments</SectionTitle>
      {payments.length === 0 ? <p className="text-muted">No onboarding payments yet.</p> : (
        <ul className="divide-y divide-line border-y border-ink">
          {payments.map((p) => (
            <li key={p.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
              <div>
                <p className="font-medium">{p.operator.displayName} <span className="text-[13px] text-muted">· {p.operator.countryCode} · {p.operator.lifecycle.replace(/_/g, ' ').toLowerCase()}</span></p>
                <p className="strip mt-1 text-[13px]">{formatMinor(p.totalMinor, p.currency)} ({formatMinor(p.feeMinor, p.currency)} + {formatMinor(p.taxMinor, p.currency)} {p.taxLabel ?? 'tax'}) · {p.provider}</p>
                <p className="strip text-[12px] text-muted">order {p.providerOrderId ?? '—'} · txn {p.providerPaymentId ?? '—'}{p.receiptNumber ? ` · receipt ${p.receiptNumber}` : ''}</p>
                <details className="mt-2 text-[12px]"><summary className="cursor-pointer text-sectional">History ({p.events.length})</summary><ul className="mt-2 space-y-1 text-muted">{p.events.map((e) => <li key={e.id} className="strip">{e.createdAt.toISOString().slice(0, 19).replace('T', ' ')} · {e.type}{e.toStatus && e.fromStatus !== e.toStatus ? ` · ${e.fromStatus ?? '—'} → ${e.toStatus}` : ''}</li>)}</ul></details>
              </div>
              <div><Pill tone={p.status === 'PAID' ? 'verified' : ['PAYMENT_FAILED', 'PAYMENT_REVERSED'].includes(p.status) ? 'danger' : 'neutral'}>{p.status.replace(/_/g, ' ')}</Pill>{p.failureReason && <p className="mt-1 text-[12px] text-muted">{p.failureReason}</p>}</div>
              <div className="flex flex-col gap-2">
                {p.providerOrderId && ['PAYMENT_PENDING', 'PAYMENT_PROCESSING'].includes(p.status) && <InlineAction action={reconcileAction} hidden={{ paymentId: p.id }} label="Check with provider" variant="ghost" />}
                {canManage && p.status === 'PAID' && <InlineAction action={refundAction} hidden={{ paymentId: p.id }} label="Refund" variant="danger" reason={{ label: 'Reason (recorded in the audit log)', required: true }} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
