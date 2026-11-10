'use client';

import { useState } from 'react';
import { buttonClass } from './button';
import { ActionForm, Field, SubmitButton, Textarea, type FormState } from './form';

/**
 * A small form bound to a server action, with an optional confirmation step and reason field.
 * Used for consequential one-click actions (cancel, approve, withdraw…).
 */
export function InlineAction({
  action,
  hidden,
  label,
  variant = 'secondary',
  confirm,
  reason,
  successMessage,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  hidden: Record<string, string | number>;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  confirm?: string;
  reason?: { label: string; required?: boolean; name?: string };
  successMessage?: string;
}) {
  const [armed, setArmed] = useState(!confirm && !reason);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={buttonClass(variant === 'primary' ? 'primary' : variant, 'md')}>
        {label}
      </button>
    );
  }
  return (
    <ActionForm action={action} successMessage={successMessage} className="flex w-full max-w-md flex-col gap-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {confirm && <p className="text-sm text-ink-2">{confirm}</p>}
      {reason && (
        <Field name={reason.name ?? 'reason'} label={reason.label}>
          <Textarea name={reason.name ?? 'reason'} rows={3} required={reason.required} />
        </Field>
      )}
      <div className="flex gap-3">
        <SubmitButton variant={variant}>{label}</SubmitButton>
        {(confirm || reason) && (
          <button type="button" onClick={() => setArmed(false)} className={buttonClass('ghost', 'md')}>
            Keep it
          </button>
        )}
      </div>
    </ActionForm>
  );
}
