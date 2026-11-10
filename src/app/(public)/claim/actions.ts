'use server';

import { redirect } from 'next/navigation';
import type { FormState } from '@/components/ui/form';
import { runAction } from '@/server/action';
import { getViewer } from '@/server/auth/viewer';
import { AppError } from '@/server/errors';
import { claimViaInvitation, suppress } from '@/server/invitations/service';
import { readUnsubscribe } from '@/server/invitations/tokens';

const str = (fd: FormData, k: string) => (typeof fd.get(k) === 'string' ? String(fd.get(k)) : undefined);

/** POST only: a GET of the invitation page never consumes the link. */
export async function claimInvitationAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 'token') ?? '';
  const v = await getViewer();
  if (!v) redirect(`/sign-in?next=${encodeURIComponent(`/claim/${token}`)}`);
  const res = await runAction(() => claimViaInvitation(v, { token, claimantRole: str(fd, 'claimantRole'), workPhone: str(fd, 'workPhone'), authorised: str(fd, 'authorised') }));
  if (res.ok) redirect('/operator/onboarding?claimed=1');
  return res;
}

export async function unsubscribeAction(_: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const email = readUnsubscribe(str(fd, 'e'), str(fd, 's'));
    if (!email) throw new AppError('VALIDATION', 'This unsubscribe link is not valid. Reply to the e-mail you received and we will remove you by hand.');
    await suppress(email, 'UNSUBSCRIBED', 'unsubscribe page');
  }, 'You have been unsubscribed. You will not receive further invitations from ThePrivate.');
}
