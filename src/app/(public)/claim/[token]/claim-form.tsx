'use client';

import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { claimInvitationAction } from '../actions';

/** The explicit claim step (POST). Styled for the night panel on the invitation page. */
export function ClaimForm({ token, company }: { token: string; company: string }) {
  return (
    <ActionForm action={claimInvitationAction} className="grid gap-6 rounded-sm bg-paper p-6 text-ink">
      <input type="hidden" name="token" value={token} />
      <Field name="claimantRole" label="Your role at the company">
        <Input name="claimantRole" required autoComplete="organization-title" placeholder="e.g. Director, Head of charter sales" />
      </Field>
      <Field name="workPhone" label="Phone (optional)">
        <Input name="workPhone" type="tel" autoComplete="tel" />
      </Field>
      <label className="flex items-start gap-3 text-[14px] leading-relaxed">
        <input type="checkbox" name="authorised" value="yes" required className="mt-1 size-[18px] shrink-0 accent-magenta" />
        <span>I am authorised to represent {company}. I understand our team will review this claim before the company is verified.</span>
      </label>
      <SubmitButton pendingLabel="Submitting…" className="h-12">Claim this profile</SubmitButton>
    </ActionForm>
  );
}
