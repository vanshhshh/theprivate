import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from './chrome';
import { RailNav, type NavItem } from './sub-nav';

/**
 * Shared shell for the operator workspace and the admin console: a night-chart rail,
 * a paper work surface. Same tokens as the public site, denser information layout.
 */
export function ConsoleShell({ title, context, groups, children, footer }: { title: string; context?: ReactNode; groups: { title?: string; items: NavItem[] }[]; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="relative bg-night text-paper lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-linear-to-b from-transparent via-dusk/30 to-transparent lg:block" />
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <Link href="/" aria-label="ThePrivate home" className="text-paper">
            <Wordmark />
          </Link>
          <p className="strip text-[10px] uppercase tracking-[0.2em] text-dusk/80 lg:mt-3">{title}</p>
        </div>
        {context && <div className="border-y border-night-line px-5 py-4 text-sm">{context}</div>}
        <details className="group px-2 py-4 lg:open" open>
          <summary className="cursor-pointer list-none px-3 pb-3 text-sm text-paper/60 lg:hidden">Menu</summary>
          <RailNav groups={groups} />
        </details>
        {footer && <div className="px-5 pb-6 text-sm text-paper/60">{footer}</div>}
      </aside>
      <main id="main" className="min-w-0 px-5 py-10 md:px-12 md:py-12">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
