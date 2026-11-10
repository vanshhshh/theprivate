'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/components/ui/form';
import { VerificationCheckType } from '@/generated/prisma/enums';
import { files, nestedForm } from '@/lib/form-data';
import { runAction } from '@/server/action';
import { ACTIVE_OPERATOR_COOKIE, requireOperator, requireViewer } from '@/server/auth/viewer';
import { AppError } from '@/server/errors';
import { cancelBooking, confirmBooking, progressBooking } from '@/server/services/bookings';
import { changeEmptyLegStatus, publishEmptyLeg, respondEnquiry } from '@/server/services/empty-legs';
import { addAircraft, addAircraftImage, addAvailability, deleteAvailability, reconfirmAvailability, setOperationalStatus, setPricing, submitAircraft, updateAircraft } from '@/server/services/fleet';
import { acceptAgreement, addMember, submitClaim, submitForVerification, updateOperatorProfile, uploadVerificationDocument } from '@/server/services/operators';
import { declineRfqAsOperator, reviseQuote, submitQuote, withdrawQuote } from '@/server/services/quotes';

const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k, v]) => !k.startsWith('$ACTION') && typeof v === 'string'));

export async function switchOperatorAction(fd: FormData) {
  const v = await requireViewer();
  const id = String(fd.get('operatorId'));
  if (v.memberships.some((m) => m.operatorId === id)) (await cookies()).set(ACTIVE_OPERATOR_COOKIE, id, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
  redirect('/operator');
}

export async function claimAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => submitClaim(await requireViewer(), obj(fd)), 'Claim submitted. Our supply team will review it and notify you. Claiming does not grant access until approved.');
  revalidatePath('/operator/onboarding');
  return res;
}

export async function profileAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => updateOperatorProfile(await requireOperator('MANAGER'), obj(fd)), 'Profile saved.');
  revalidatePath('/operator/profile');
  return res;
}

export async function addMemberAction(_: FormState, fd: FormData): Promise<FormState> {
  const role = z.enum(['MANAGER', 'DISPATCHER', 'VIEWER']).parse(fd.get('role'));
  const res = await runAction(async () => addMember(await requireOperator('OWNER'), String(fd.get('email')), role), 'Team member added.');
  revalidatePath('/operator/profile');
  return res;
}

export async function uploadCheckAction(_: FormState, fd: FormData): Promise<FormState> {
  const type = z.enum(VerificationCheckType).parse(fd.get('type'));
  const res = await runAction(async () => {
    const file = files(fd, 'file')[0];
    if (!file) throw new AppError('VALIDATION', 'Choose a file to upload.', { file: 'Required' });
    return uploadVerificationDocument(await requireOperator('MANAGER'), type, file, (fd.get('expiresAt') as string) || null);
  }, 'Document uploaded.');
  revalidatePath('/operator/verification');
  return res;
}

export async function submitVerificationAction(_: FormState): Promise<FormState> {
  const res = await runAction(async () => submitForVerification(await requireOperator('OWNER')), 'Submitted for verification. We will notify you of the outcome.');
  revalidatePath('/operator');
  return res;
}

export async function acceptAgreementAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    return acceptAgreement(await requireOperator('OWNER'), String(fd.get('agreementId')), String(fd.get('typedName') ?? ''), ip);
  }, 'Agreement signed. ThePrivate will activate your account shortly.');
  revalidatePath('/operator');
  return res;
}

// ---- Fleet --------------------------------------------------------------------------------

export async function addAircraftAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => addAircraft(await requireOperator('MANAGER'), obj(fd)));
  if (res.ok) redirect(`/operator/fleet/${res.data.id}`);
  return res;
}

export async function updateAircraftAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id'));
  const res = await runAction(async () => {
    const r = await updateAircraft(await requireOperator('MANAGER'), id, obj(fd));
    return r;
  });
  revalidatePath(`/operator/fleet/${id}`);
  if (res.ok) return { ok: true, message: res.data.backToDraft ? 'Saved. Because a key detail changed, the aircraft must be re-submitted for review.' : 'Saved.' };
  return res;
}

export async function submitAircraftAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id'));
  const res = await runAction(async () => submitAircraft(await requireOperator('MANAGER'), id), 'Submitted for review.');
  revalidatePath(`/operator/fleet/${id}`);
  return res;
}

export async function operationalStatusAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id'));
  const res = await runAction(async () => setOperationalStatus(await requireOperator('DISPATCHER'), id, String(fd.get('status'))), 'Status updated.');
  revalidatePath(`/operator/fleet/${id}`);
  return res;
}

export async function imageAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id'));
  const res = await runAction(async () => {
    const f = files(fd, 'photo')[0];
    if (!f) throw new AppError('VALIDATION', 'Choose a photo.', { photo: 'Required' });
    return addAircraftImage(await requireOperator('MANAGER'), id, f, String(fd.get('alt') ?? ''));
  }, 'Photo uploaded. It becomes public once the aircraft is approved.');
  revalidatePath(`/operator/fleet/${id}`);
  return res;
}

export async function availabilityAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id'));
  const res = await runAction(async () => addAvailability(await requireOperator('DISPATCHER'), id, obj(fd)), 'Window added.');
  revalidatePath(`/operator/fleet/${id}`);
  return res;
}

export async function availabilityOpAction(_: FormState, fd: FormData): Promise<FormState> {
  const op = String(fd.get('op'));
  const res = await runAction(async () => {
    const ctx = await requireOperator('DISPATCHER');
    return op === 'delete' ? deleteAvailability(ctx, String(fd.get('windowId'))) : reconfirmAvailability(ctx, String(fd.get('windowId')));
  }, op === 'delete' ? 'Window removed.' : 'Availability re-confirmed.');
  revalidatePath(`/operator/fleet/${fd.get('id')}`);
  return res;
}

export async function pricingAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id'));
  const res = await runAction(async () => setPricing(await requireOperator('MANAGER'), id, obj(fd)), 'Rate saved. It is confidential and only used for indicative ranges.');
  revalidatePath(`/operator/fleet/${id}`);
  return res;
}

// ---- Requests, quotes, bookings ------------------------------------------------------------

export async function quoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const ref = String(fd.get('reference'));
  const quoteId = fd.get('quoteId') ? String(fd.get('quoteId')) : null;
  const res = await runAction(async () => {
    const ctx = await requireOperator('DISPATCHER');
    const data = nestedForm(fd);
    return quoteId ? reviseQuote(ctx, quoteId, data) : submitQuote(ctx, ref, data);
  }, quoteId ? 'Quote revised. The customer has been notified.' : 'Quote sent. The customer has been notified.');
  revalidatePath(`/operator/requests/${ref}`);
  return res as FormState;
}

export async function withdrawQuoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => withdrawQuote(await requireOperator('DISPATCHER'), String(fd.get('quoteId'))), 'Quote withdrawn.');
  revalidatePath(`/operator/requests/${fd.get('reference')}`);
  return res;
}

export async function declineRfqAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => declineRfqAsOperator(await requireOperator('DISPATCHER'), String(fd.get('reference')), String(fd.get('reason') ?? '')), 'Request declined.');
  revalidatePath('/operator/requests');
  return res;
}

export async function bookingAction(_: FormState, fd: FormData): Promise<FormState> {
  const ref = String(fd.get('reference'));
  const op = String(fd.get('op'));
  const res = await runAction(async () => {
    const ctx = await requireOperator('DISPATCHER');
    if (op === 'confirm') return confirmBooking(await requireOperator('MANAGER'), ref);
    if (op === 'cancel') return cancelBooking(ctx.viewer, ref, String(fd.get('reason') ?? ''), 'OPERATOR', ctx.operatorId);
    if (op === 'start') return progressBooking(ctx, ref, 'IN_PROGRESS');
    if (op === 'complete') return progressBooking(ctx, ref, 'COMPLETED');
    throw new AppError('VALIDATION', 'Unknown action.');
  }, 'Booking updated.');
  revalidatePath(`/operator/bookings/${ref}`);
  return res;
}

export async function emptyLegAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => publishEmptyLeg(await requireOperator('MANAGER'), obj(fd)), 'Empty leg published.');
  revalidatePath('/operator/empty-legs');
  return res as FormState;
}

export async function emptyLegStatusAction(_: FormState, fd: FormData): Promise<FormState> {
  const to = z.enum(['WITHDRAWN', 'SOLD']).parse(fd.get('to'));
  const res = await runAction(async () => {
    const ctx = await requireOperator('MANAGER');
    return changeEmptyLegStatus(ctx.viewer, String(fd.get('id')), to, 'OPERATOR', ctx.operatorId);
  }, 'Listing updated.');
  revalidatePath('/operator/empty-legs');
  return res;
}

export async function enquiryAction(_: FormState, fd: FormData): Promise<FormState> {
  const status = z.enum(['RESPONDED', 'CONVERTED', 'CLOSED']).parse(fd.get('status'));
  const res = await runAction(async () => respondEnquiry(await requireOperator('DISPATCHER'), String(fd.get('id')), status), 'Enquiry updated.');
  revalidatePath('/operator/empty-legs');
  return res;
}
