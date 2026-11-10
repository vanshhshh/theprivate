'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn('nav-pending', pending && 'is-pending')} />;
}

/** Header link: marks the current section and shows immediate feedback while the next page loads. */
export function NavLink({ href, children, className, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const path = usePathname();
  const current = path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className={cn('relative py-1 transition-colors', className)} {...rest}>
      {children}
      <span aria-hidden className={cn('absolute -bottom-0.5 left-0 h-px bg-current transition-[width] duration-[var(--dur-3)] ease-[var(--ease-climb)]', current ? 'w-full' : 'w-0')} />
      <Pending />
    </Link>
  );
}
