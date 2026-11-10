import Link from 'next/link';
import { getViewer } from '@/server/auth/viewer';
import { prisma } from '@/server/db/client';
import { MobileNav } from './mobile-nav';
import { NavLink } from './nav-link';

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display inline-flex items-baseline text-[22px] leading-none ${className}`}>
      <span className="italic">The</span>
      <span className="font-medium">Private</span>
      <svg aria-hidden viewBox="0 0 10 10" className="ml-0.5 size-2 -translate-y-2.5 text-magenta">
        <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" />
      </svg>
    </span>
  );
}

/**
 * Auth-gated areas answer differently per session and may redirect; prefetching them is wasted
 * work and a redirecting prefetch can re-render the current segment. Never prefetch them.
 */
export const isGated = (href: string) => /^\/(operator|account|admin)(\/|$|\?)/.test(href);

/** Customer navigation. Business concepts (operators, partner programme) live in the footer. */
export const PUBLIC_NAV = [
  { href: '/charter', label: 'Plan a flight' },
  { href: '/empty-legs', label: 'One-way offers' },
  { href: '/aircraft-for-sale', label: 'Aircraft for sale' },
  { href: '/about', label: 'About' },
];

export async function SiteHeader() {
  const v = await getViewer();
  const unread = v ? await prisma.notification.count({ where: { userId: v.user.id, readAt: null } }) : 0;
  const account = v ? { name: v.user.name, unread, isStaff: v.isStaff, isOperator: v.memberships.length > 0 } : null;
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-6 px-5 md:px-12">
        <Link href="/" aria-label="ThePrivate home">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-8 text-[14px] text-ink-2 lg:flex">
          {PUBLIC_NAV.map((n) => (
            <NavLink key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-6 text-[14px] lg:flex">
          {account ? (
            <>
              {account.isStaff && <Link href="/admin" prefetch={false} className="text-ink-2 hover:text-ink">Admin</Link>}
              {account.isOperator && <Link href="/operator" prefetch={false} className="text-ink-2 hover:text-ink">Workspace</Link>}
              <Link href="/account/notifications" prefetch={false} className="relative text-ink-2 hover:text-ink" aria-label={`Inbox${account.unread ? `, ${account.unread} unread` : ''}`}>
                Inbox
                {account.unread > 0 && <span className="strip absolute -right-4 -top-2 rounded-full bg-magenta px-1.5 text-[10px] !text-paper">{account.unread}</span>}
              </Link>
              <Link href="/account" prefetch={false} className="rounded-full border border-ink/70 px-4 py-1.5 transition-colors hover:bg-ink hover:text-paper">
                {account.name.split(' ')[0]}
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-ink-2 hover:text-ink">Sign in</Link>
              <Link href="/charter/request" className="header-cta rounded-full bg-ink px-5 py-2 text-paper transition-colors duration-[var(--dur-2)] hover:bg-magenta">Request a flight</Link>
            </>
          )}
        </div>
        <MobileNav account={account} />
      </div>
    </header>
  );
}

const FOOTER: [string, [string, string][]][] = [
  ['Travel', [['Plan a flight', '/charter'], ['One-way offers', '/empty-legs'], ['Aircraft for sale', '/aircraft-for-sale'], ['Sell an aircraft', '/sell-aircraft']]],
  ['Company', [['About', '/about'], ['Contact', '/contact'], ['Our flight partners', '/operators'], ['Partner with ThePrivate', '/for-operators']]],
  ['Legal', [['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Photography credits', '/legal/media-credits']]],
];

export function SiteFooter() {
  return (
    <footer className="relative mt-28 overflow-hidden bg-night text-paper/80">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-dusk/50 to-transparent" />
      <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-20 md:px-12">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-[44px] leading-[0.95] text-paper md:text-[64px]">
              Where <em>to?</em>
            </p>
            <Link href="/charter" className="link-draw mt-6 inline-flex items-center gap-2 text-[15px] text-dusk">
              Plan a flight <span className="arrow" aria-hidden>→</span>
            </Link>
          </div>
          {FOOTER.map(([title, links]) => (
            <div key={title}>
              <p className="strip mb-5 text-[11px] uppercase tracking-[0.2em] text-paper/40">{title}</p>
              <ul className="space-y-3 text-[15px]">
                {links.map(([l, h]) => (
                  <li key={h}>
                    <Link href={h} prefetch={isGated(h) ? false : undefined} className="link-draw hover:text-paper">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-20 flex flex-col gap-6 border-t border-night-line pt-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Wordmark className="text-paper" />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/50">
              ThePrivate arranges private flights with licensed air operators, who operate every flight. ThePrivate is not an air operator.
            </p>
          </div>
          <p className="strip text-[11px] text-paper/35">© {new Date().getFullYear()} ThePrivate · Airport data: OurAirports (public domain)</p>
        </div>
      </div>
    </footer>
  );
}
