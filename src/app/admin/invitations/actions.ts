'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/components/ui/form';
import { runAction } from '@/server/action';
import { requireViewer } from '@/server/auth/viewer';
import { verifySmtp } from '@/server/email/mailer';
import { AppError } from '@/server/errors';
import { approveAndQueueCampaign, createCampaign, resendInvitation, revokeInvitation, sendTestInvitation, suppress } from '@/server/invitations/service';

const s = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? String(fd.get(k)) : '');

export async function testSmtpAction(_: FormState, _fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const v = await requireViewer();
    if (!v.permissions.has('invite.manage')) throw new AppError('FORBIDDEN', 'Not allowed.');
    const r = await verifySmtp();
    if (!r.ok) throw new AppError('NOT_CONFIGURED', `SMTP check failed: ${r.error}`);
  }, 'SMTP connection and credentials accepted. Nothing was sent.');
}

export async function sendTestAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const r = await sendTestInvitation(await requireViewer(), s(fd, 'operatorId'), s(fd, 'to'));
    return r.messageId;
  }, 'Test e-mail handed to the mail server. Check the inbox (and spam folder) to confirm delivery.');
}

export async function createCampaignAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await runAction(async () => createCampaign(await requireViewer(), { name: s(fd, 'name'), operatorIds: fd.getAll('operatorId').map(String) }));
  if (res.ok) redirect(`/admin/invitations/campaigns/${res.data.campaign.id}`);
  return res;
}

export async function approveCampaignAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = s(fd, 'campaignId');
  const res = await runAction(async () => {
    if (s(fd, 'confirm') !== 'SEND') throw new AppError('VALIDATION', 'Type SEND to confirm.', { confirm: 'Type SEND' });
    return approveAndQueueCampaign(await requireViewer(), id, Number(s(fd, 'confirmCount')));
  }, 'Approved. Invitations are queued and will be sent gradually by the background worker.');
  revalidatePath(`/admin/invitations/campaigns/${id}`);
  return res;
}

export async function revokeAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    await revokeInvitation(await requireViewer(), s(fd, 'invitationId'), s(fd, 'reason') || 'Revoked by staff');
    revalidatePath('/admin/invitations', 'layout');
  }, 'Invitation revoked. Its link no longer works.');
}

export async function resendAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    await resendInvitation(await requireViewer(), s(fd, 'invitationId'));
    revalidatePath('/admin/invitations', 'layout');
  }, 'Queued with a new link. The previous link has stopped working.');
}

export async function suppressAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const v = await requireViewer();
    if (!v.permissions.has('invite.manage')) throw new AppError('FORBIDDEN', 'Not allowed.');
    const reason = s(fd, 'reason') as 'HARD_BOUNCE' | 'COMPLAINT' | 'MANUAL';
    if (!['HARD_BOUNCE', 'COMPLAINT', 'MANUAL'].includes(reason)) throw new AppError('VALIDATION', 'Choose a reason.');
    await suppress(s(fd, 'email'), reason, `staff ${v.user.id}`);
    revalidatePath('/admin/invitations', 'layout');
  }, 'Address suppressed. It will never be e-mailed again.');
}
