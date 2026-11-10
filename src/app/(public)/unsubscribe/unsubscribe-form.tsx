'use client';

import { ActionForm, SubmitButton } from '@/components/ui/form';
import { unsubscribeAction } from '../claim/actions';

export function UnsubscribeForm({ e, s }: { e: string; s: string }) {
  return (
    <ActionForm action={unsubscribeAction}>
      <input type="hidden" name="e" value={e} />
      <input type="hidden" name="s" value={s} />
      <SubmitButton variant="secondary">Unsubscribe</SubmitButton>
    </ActionForm>
  );
}
