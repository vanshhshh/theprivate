'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/components/ui/form';
import { runAction } from '@/server/action';
import { requireViewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { AppError } from '@/server/errors';
import { saveSettings } from '@/server/services/account';
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

export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => saveSettings(await requireViewer(), Object.fromEntries(fd)), 'Settings saved.');
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
