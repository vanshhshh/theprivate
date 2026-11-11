import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ApiError } from '@/api/client';
import type { Status } from '@/api/types';
import { Icon } from './Icon';

type Variant = 'primary' | 'light' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-magenta text-paper active:bg-magenta-2',
  light: 'bg-paper text-ink',
  secondary: 'border border-ink/20 text-ink bg-transparent',
  ghost: 'text-ink underline underline-offset-4 decoration-ink/30 h-auto px-0',
  danger: 'border border-danger/40 text-danger bg-transparent',
};

export function buttonClass(variant: Variant = 'primary', extra = '') {
  return `inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-medium transition-transform duration-100 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${VARIANT[variant]} ${extra}`;
}

export function Button({ variant = 'primary', busy, children, className = '', ...rest }: ComponentProps<'button'> & { variant?: Variant; busy?: boolean }) {
  return (
    <button type="button" {...rest} disabled={busy || rest.disabled} aria-busy={busy} className={buttonClass(variant, className)}>
      {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'primary', className = '', ...rest }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...rest} className={buttonClass(variant, className)} />;
}

const TONE: Record<Status['tone'], string> = {
  verified: 'bg-verified-bg text-verified',
  indicative: 'bg-indicative-bg text-indicative',
  unconfirmed: 'bg-unconfirmed-bg text-unconfirmed',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-paper-3 text-ink-2',
  accent: 'bg-magenta/10 text-magenta',
  info: 'bg-sectional/10 text-sectional',
};

/** The server's customer wording, coloured by meaning (never decorative). */
export function StatusChip({ status, className = '' }: { status: Status; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${TONE[status.tone] ?? TONE.neutral} ${className}`}>{status.label}</span>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'h-[52px] w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 text-[16px] text-ink outline-none placeholder:text-muted/70 focus:border-ink';

/** A detail-screen top bar on paper: back, title, optional action. Sits under the safe area. */
export function TopBar({ title, action, onBack, tone = 'paper' }: { title?: string; action?: ReactNode; onBack?: () => void; tone?: 'paper' | 'night' }) {
  const navigate = useNavigate();
  const night = tone === 'night';
  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-2 px-3 ${night ? 'text-paper' : 'border-b border-line bg-paper/92 text-ink backdrop-blur-lg'}`}
      style={{ paddingTop: 'calc(var(--safe-top) + 6px)', paddingBottom: 6 }}
    >
      <button type="button" aria-label="Back" onClick={onBack ?? (() => navigate(-1))} className={`grid size-11 place-items-center rounded-full ${night ? 'bg-night/40 backdrop-blur-md' : ''}`}>
        <Icon name="chevron-left" className="size-6" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[16px] font-medium">{title}</h1>
      {action}
    </header>
  );
}

export function Section({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-6 py-7 ${className}`}>
      {title && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="strip text-[11px] uppercase tracking-[0.22em] text-muted">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <h2 className="font-display text-[26px] leading-tight">{title}</h2>
      {children && <p className="mx-auto mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ink-2">{children}</p>}
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const offline = error.code === 'NETWORK' || error.code === 'TIMEOUT';
  return (
    <div role="alert" className="px-6 py-14 text-center">
      <h2 className="font-display text-[24px] leading-tight">{offline ? 'You’re offline' : 'Something went wrong'}</h2>
      <p className="mx-auto mt-3 max-w-[34ch] text-[15px] text-ink-2">{error.message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4 px-6 py-8">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-sm bg-paper-3/70" />
      ))}
    </div>
  );
}

/** Bottom sheet for commitments and pickers. Focus moves to its title; Escape / scrim closes it. */
export function Sheet({ open, title, onClose, children, tall }: { open: boolean; title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-night/60 animate-[fade_200ms_ease-out_both]" onClick={onClose} />
      <div
        className={`relative flex flex-col rounded-t-[28px] bg-paper text-ink shadow-2xl animate-[sheet_320ms_var(--ease-climb)_both] ${tall ? 'h-[92svh]' : 'max-h-[88svh]'}`}
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink/15" />
        <div className="flex items-center justify-between px-6 pb-2 pt-3">
          <h2 ref={titleRef} tabIndex={-1} className="font-display text-[24px] leading-tight outline-none">
            {title}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full text-muted">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">{children}</div>
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  const c = { info: 'border-sectional/30 bg-sectional/5', warning: 'border-indicative/40 bg-indicative-bg', danger: 'border-danger/40 bg-danger-bg', success: 'border-verified/40 bg-verified-bg' }[tone];
  return <div className={`rounded-sm border-l-2 px-4 py-3 text-[14px] leading-relaxed text-ink-2 ${c}`}>{children}</div>;
}
