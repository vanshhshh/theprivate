'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/cn';
import { buttonClass } from './button';
import { fieldControl, fieldLabel } from './styles';

export type FormState = { ok: true; message?: string; data?: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string> } | null;
type FormAction = (prev: FormState, fd: FormData) => Promise<FormState>;

const FormCtx = createContext<FormState>(null);
/** Unique control id provided by <Field>, so repeated forms never produce duplicate ids. */
const FieldIdCtx = createContext<string | null>(null);

/**
 * Server-action form with real states: pending (button), field errors, form error, success.
 * The server is the source of truth; nothing here pretends to succeed.
 */
export function ActionForm({ action, children, className, resetOnSuccess, successMessage, ...rest }: Omit<ComponentProps<'form'>, 'action'> & { action: FormAction; resetOnSuccess?: boolean; successMessage?: string }) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <FormCtx.Provider value={state}>
      <form
        ref={ref}
        action={formAction}
        // With JS, submit via a transition so React does not auto-reset the fields: a validation
        // error must never erase what the user typed. Without JS the native action still works.
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => formAction(fd));
        }}
        className={className}
        noValidate
        {...rest}
      >
        {state && !state.ok && (
          <div role="alert" className="mb-6 rounded-sm border-l-2 border-danger bg-danger-bg px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        )}
        {state?.ok && (state.message || successMessage) && (
          <div role="status" className="mb-6 rounded-sm border-l-2 border-verified bg-verified-bg px-4 py-3 text-sm text-verified">
            {state.message ?? successMessage}
          </div>
        )}
        {children}
      </form>
    </FormCtx.Provider>
  );
}

/** The latest result of the surrounding ActionForm (null before the first submit). */
export function useActionFormState(): FormState {
  return useContext(FormCtx);
}

export function useFieldError(name: string): string | undefined {
  const s = useContext(FormCtx);
  return s && !s.ok ? s.fieldErrors?.[name] : undefined;
}

export function SubmitButton({ children, variant = 'primary', className, pendingLabel = 'Working…', ...rest }: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending} className={buttonClass(variant, 'md', className)} {...rest}>
      {pending ? (
        <>
          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

const control = fieldControl;

export function Field({ name, label, hint, children, className }: { name: string; label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  const error = useFieldError(name);
  const id = `${name.replace(/[^\w-]/g, '_')}-${useId().replace(/:/g, '')}`;
  return (
    <FieldIdCtx.Provider value={id}>
      <div className={cn('group flex flex-col gap-1', className)}>
        <label htmlFor={id} className={fieldLabel}>
          {label}
        </label>
        {children}
        {error ? (
          <p id={`${id}-error`} className="text-sm text-danger">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    </FieldIdCtx.Provider>
  );
}

function useControlIds(name: string, explicit?: string) {
  const fieldId = useContext(FieldIdCtx);
  const error = useFieldError(name);
  const id = explicit ?? fieldId ?? undefined;
  return { id, error, describedBy: error && id ? `${id}-error` : undefined };
}

export function Input({ name, className, id: explicit, ...props }: ComponentProps<'input'> & { name: string }) {
  const { id, error, describedBy } = useControlIds(name, explicit);
  return <input id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={cn(control, className)} {...props} />;
}

export function Textarea({ name, className, id: explicit, ...props }: ComponentProps<'textarea'> & { name: string }) {
  const { id, error, describedBy } = useControlIds(name, explicit);
  return <textarea id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} rows={4} className={cn(control, 'resize-y', className)} {...props} />;
}

export function Select({ name, className, children, id: explicit, ...props }: ComponentProps<'select'> & { name: string }) {
  const { id, error, describedBy } = useControlIds(name, explicit);
  return (
    <select id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={cn(control, 'cursor-pointer appearance-none bg-[length:12px] bg-[right_2px_center] bg-no-repeat pr-6', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111518' stroke-width='1.5'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ name, label, ...props }: ComponentProps<'input'> & { name: string; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" name={name} className="mt-0.5 size-[18px] shrink-0 accent-magenta" {...props} />
      <span>{label}</span>
    </label>
  );
}
