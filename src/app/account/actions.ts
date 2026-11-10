'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/components/ui/form';
import { runAction } from '@/server/action';
import { requireViewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError } from '@/server/errors';
import { cancelBooking } from '@/server/services/bookings';
import { acceptQuote, declineQuote } from '@/server/services/quotes';
import { cancelRfq } from '@/server/services/rfq';
import { sellerUpdateStatus } from '@/server/services/sales';

export async function acceptQuoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const v = await requireViewer();
    if (fd.get('confirm') !== 'yes') throw new AppError('VALIDATION', 'Please confirm that you have read the quote terms.', { confirm: 'Required' });
    return acceptQuote(v, String(fd.get('quoteId')), Number(fd.get('revision')));
  });
  if (res.ok) redirect(`/account/bookings/${res.data.reference}?new=1`);
  return res;
}

export async function declineQuoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => declineQuote(await requireViewer(), String(fd.get('quoteId'))), 'Quote declined.');
  revalidatePath('/account/trips');
  return res;
}

export async function cancelRfqAction(_: FormState, fd: FormData): Promise<FormState> {
  const ref = String(fd.get('reference'));
  const res = await runAction(async () => cancelRfq(await requireViewer(), ref, String(fd.get('reason') ?? '')), 'Request cancelled.');
  revalidatePath(`/account/trips/${ref}`);
  return res;
}

export async function cancelBookingAction(_: FormState, fd: FormData): Promise<FormState> {
  const ref = String(fd.get('reference'));
  const res = await runAction(async () => cancelBooking(await requireViewer(), ref, String(fd.get('reason') ?? ''), 'CUSTOMER'), 'Booking cancelled.');
  revalidatePath(`/account/bookings/${ref}`);
  return res;
}

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  companyName: z.string().trim().max(160).optional(),
  preferredCurrency: z.enum(['INR', 'AED', 'USD', 'EUR', 'GBP', 'SGD']),
  timezone: z.string().max(60),
  marketingOptIn: z.coerce.boolean().optional(),
});

export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const v = await requireViewer();
    const input = settingsSchema.parse(Object.fromEntries(fd));
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timezone });
    } catch {
      throw new AppError('VALIDATION', 'Unknown timezone.', { timezone: 'Unknown timezone' });
    }
    await prisma.user.update({ where: { id: v.user.id }, data: { name: input.name, phone: input.phone || null, timezone: input.timezone } });
    const profile = { companyName: input.companyName || null, preferredCurrency: input.preferredCurrency, marketingOptIn: Boolean(input.marketingOptIn) };
    await prisma.customerProfile.upsert({ where: { userId: v.user.id }, create: { userId: v.user.id, ...profile }, update: profile });
  }, 'Settings saved.');
  revalidatePath('/account');
  return res;
}

export async function markAllReadAction(): Promise<void> {
  const v = await requireViewer();
  await prisma.notification.updateMany({ where: { userId: v.user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath('/account/notifications');
}

export async function openNotificationAction(fd: FormData): Promise<void> {
  const v = await requireViewer();
  const id = String(fd.get('id'));
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== v.user.id) return;
  await prisma.notification.update({ where: { id }, data: { readAt: n.readAt ?? new Date() } });
  redirect(n.link && n.link.startsWith('/') ? n.link : '/account/notifications');
}

export async function listingStatusAction(_: FormState, fd: FormData): Promise<FormState> {
  const to = z.enum(['SUBMITTED', 'WITHDRAWN', 'SOLD']).parse(fd.get('to'));
  const res = await runAction(async () => sellerUpdateStatus(await requireViewer(), String(fd.get('id')), to), 'Listing updated.');
  revalidatePath('/account/listings');
  return res;
}
