'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  badge?: number;
}

export function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
}

/** Horizontal section navigation with an animated ink underline on the active tab. */
export function SubNav({ items, label, variant = 'paper' }: { items: NavItem[]; label: string; variant?: 'paper' | 'glass' }) {
  const path = usePathname();
  if (variant === 'glass') {
    return (
      <nav aria-label={label}>
        <ul className="flex w-max max-w-full gap-1 overflow-x-auto rounded-full p-1 glass-dark text-[14px]">
          {items.map((it) => {
            const active = isActive(path, it);
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={active ? 'page' : undefined} className={cn('block whitespace-nowrap rounded-full px-4 py-2 transition-colors duration-[var(--dur-2)]', active ? 'bg-paper text-ink' : 'text-paper/75 hover:text-paper')}>
                  {it.label}
                  {it.badge ? <span className="strip ml-1.5 rounded-full bg-magenta px-1.5 text-[10px] text-paper">{it.badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label={label} className="border-b border-line bg-paper">
      <ul className="mx-auto flex max-w-[1240px] gap-7 overflow-x-auto px-5 text-[14px] md:px-8">
        {items.map((it) => {
          const active = isActive(path, it);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? 'page' : undefined} className={cn('relative block whitespace-nowrap py-3.5 transition-colors', active ? 'text-ink' : 'text-muted hover:text-ink')}>
                {it.label}
                {it.badge ? <span className="strip ml-1.5 bg-magenta px-1 text-[10px] text-paper">{it.badge}</span> : null}
                <span className={cn('absolute bottom-0 left-0 h-[2px] bg-ink transition-[width] duration-[var(--dur-3)] ease-[var(--ease-climb)]', active ? 'w-full' : 'w-0')} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Vertical rail for the operator and admin consoles. */
export function RailNav({ groups }: { groups: { title?: string; items: NavItem[] }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-7 text-[14px]">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && <p className="strip mb-2 px-3 text-[10px] uppercase text-paper/40">{g.title}</p>}
          <ul className="flex flex-col">
            {g.items.map((it) => {
              const active = isActive(path, it);
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? 'page' : undefined} className={cn('flex items-center justify-between rounded-r-full border-l-2 px-3 py-2 transition-colors duration-[var(--dur-2)]', active ? 'border-dusk bg-night-2 text-paper' : 'border-transparent text-paper/60 hover:bg-night-2/60 hover:text-paper')}>
                    {it.label}
                    {it.badge ? <span className="strip rounded-full bg-magenta px-1.5 text-[10px] text-paper">{it.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
