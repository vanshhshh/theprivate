import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'verified' | 'indicative' | 'unconfirmed' | 'danger' | 'neutral' | 'accent' | 'info';
const tones: Record<Tone, string> = {
  verified: 'bg-verified-bg text-verified',
  indicative: 'bg-indicative-bg text-indicative',
  unconfirmed: 'bg-unconfirmed-bg text-unconfirmed',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-paper-3 text-ink-2',
  accent: 'bg-magenta text-paper',
  info: 'bg-sectional text-paper',
};

/** Status pill. Text always carries the meaning; colour only reinforces it. */
export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em]', tones[tone], className)}>{children}</span>;
}

export function PageHeader({ eyebrow, title, lede, actions }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-12 flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="strip mb-4 text-[11px] uppercase tracking-[0.2em] text-magenta">{eyebrow}</p>}
        <h1 className="font-display text-[40px] leading-[1.02] md:text-[56px]">{title}</h1>
        {lede && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline justify-between border-b border-ink pb-3">
      <h2 className="font-display text-[22px] leading-none">{children}</h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-sm bg-paper-2/70 px-6 py-16 text-center">
      <div aria-hidden className="chart-graticule absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_80%_at_50%_50%,#000,transparent)]" />
      <svg aria-hidden viewBox="0 0 120 40" className="relative mx-auto mb-6 h-8 w-24 text-magenta/70">
        <path d="M2 30 Q60 -8 118 30" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 4" />
        <circle cx="2" cy="30" r="2.5" fill="currentColor" />
        <circle cx="118" cy="30" r="2.5" fill="currentColor" />
      </svg>
      <h3 className="font-display relative text-[30px] leading-tight">{title}</h3>
      {children && <div className="relative mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">{children}</div>}
      {action && <div className="relative mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: string; children: ReactNode }) {
  const map = { info: 'border-sectional bg-paper-2', warning: 'border-indicative bg-indicative-bg', danger: 'border-danger bg-danger-bg', success: 'border-verified bg-verified-bg' };
  return (
    <div className={cn('rounded-sm border-l-2 px-5 py-4 text-sm leading-relaxed', map[tone])} role={tone === 'danger' ? 'alert' : undefined}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, href, hint }: { label: string; value: ReactNode; href?: string; hint?: string }) {
  const body = (
    <>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="strip mt-2 text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block border-t border-ink pt-3 transition-colors hover:text-magenta">
      {body}
    </Link>
  ) : (
    <div className="border-t border-ink pt-3">{body}</div>
  );
}

export function DL({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2.5 text-[15px]">
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? <span className="text-muted">Not provided</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-ink">
            {head.map((h, i) => (
              <th key={i} scope="col" className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:hover]:bg-paper-2/60 [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Pagination({ page, total, perPage, href }: { page: number; total: number; perPage: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between border-t border-line pt-4 text-sm">
      {page > 1 ? <Link className="hover:text-magenta" href={href(page - 1)}>← Previous</Link> : <span />}
      <span className="strip text-muted">
        {page} / {pages}
      </span>
      {page < pages ? <Link className="hover:text-magenta" href={href(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
