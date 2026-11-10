import 'server-only';
import { ZodError } from 'zod';
import { TransitionError } from '@/domain/lifecycle';
import { AppError } from '@/server/errors';
import { captureException } from '@/server/log';

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wraps every server action: expected failures become user-facing messages; anything else is
 * logged and replaced by a generic message (no stack traces or SQL reach the browser).
 */
export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join('.');
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, error: 'Please check the highlighted fields.', fieldErrors };
    }
    if (err instanceof TransitionError) return { ok: false, error: err.message };
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_')) throw err; // redirect()/notFound()
    captureException(err);
    return { ok: false, error: 'Something went wrong on our side. Please try again.' };
  }
}

/** FormData → plain object (repeated keys become arrays). */
export function formObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('$ACTION')) continue;
    if (k in o) o[k] = ([] as unknown[]).concat(o[k], v);
    else o[k] = v;
  }
  return o;
}
