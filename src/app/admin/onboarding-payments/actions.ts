'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/components/ui/form';
import { runAction } from '@/server/action';
import { requireViewer } from '@/server/auth/viewer';
import { AppError } from '@/server/errors';
import { feeConfig, reconcilePayment, refundPayment, saveFeeConfig } from '@/server/payments/onboarding/service';

const s = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? String(fd.get(k)).trim() : '');

/** Major units ("25000.00") → minor units, exactly (no floating point). */
function toMinor(v: string): number | null {
  if (!v) return null;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(v.replace(/,/g, ''));
  if (!m) throw new AppError('VALIDATION', 'Enter an amount like 25000 or 25000.00.', { amount: 'Invalid amount' });
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

function toBps(v: string): number | null {
  if (v === '') return null;
  const m = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(v);
  if (!m) throw new AppError('VALIDATION', 'Enter a percentage like 18 or 5.5 (0 if no tax applies).', { taxRate: 'Invalid rate' });
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

export async function saveFeeConfigAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const current = await feeConfig();
    await saveFeeConfig(await requireViewer(), {
      enabled: fd.get('enabled') === 'on',
      currency: s(fd, 'currency'),
      amountMinor: toMinor(s(fd, 'amount')),
      taxRateBps: toBps(s(fd, 'taxRate')),
      taxLabel: s(fd, 'taxLabel') || null,
      refundPolicy: s(fd, 'refundPolicy') || null,
      coverage: s(fd, 'coverage') || null,
      byCountry: current.byCountry,
    });
    revalidatePath('/admin/onboarding-payments');
  }, 'Saved. The change applies to new checkouts only; existing ones keep their snapshot.');
}

export async function refundAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    await refundPayment(await requireViewer(), s(fd, 'paymentId'), s(fd, 'reason'));
    revalidatePath('/admin/onboarding-payments');
  }, 'Refund requested through the payment provider.');
}

export async function reconcileAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const r = await reconcilePayment(await requireViewer(), s(fd, 'paymentId'));
    revalidatePath('/admin/onboarding-payments');
    if (!r.applied) throw new AppError('INVALID_STATE', `No change: ${r.reason}`);
  }, 'Updated from the payment provider.');
}
