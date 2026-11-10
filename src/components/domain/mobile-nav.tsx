'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const NAV = [
  { href: '/charter', label: 'Plan a flight' },
  { href: '/empty-legs', label: 'One-way offers' },
  { href: '/aircraft-for-sale', label: 'Aircraft for sale' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function MobileNav({ account }: { account: { name: string; unread: number; isStaff: boolean; isOperator: boolean } | null }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-nav" className="flex h-10 w-10 flex-col items-center justify-center gap-1.5" aria-label="Open menu">
        <span className="h-px w-6 bg-ink" />
        <span className="h-px w-6 bg-ink" />
      </button>
      {/* Portalled: the header's backdrop-filter would otherwise contain this fixed panel. */}
      {open && createPortal(
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="glass-dark fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night/80 px-6 pb-10 text-paper [animation:fade-in_var(--dur-3)_var(--ease-climb)_both]">
          <div className="flex h-16 shrink-0 items-center justify-end">
            <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 flex-col items-center justify-center" aria-label="Close menu" autoFocus>
              <span className="h-px w-6 translate-y-[0.5px] rotate-45 bg-paper" />
              <span className="h-px w-6 -translate-y-[0.5px] -rotate-45 bg-paper" />
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-6 flex flex-col">
            {NAV.map((n, i) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={path.startsWith(n.href) ? 'page' : undefined}
                className="font-display border-b border-paper/10 py-4 text-[36px] leading-none aria-[current=page]:italic"
                style={{ animation: `rise var(--dur-3) var(--ease-climb) ${80 + i * 50}ms both` }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-4 pt-10 text-[17px] text-paper/80">
            {account ? (
              <>
                <Link href="/account" prefetch={false}>Your journeys</Link>
                <Link href="/account/notifications" prefetch={false}>Inbox {account.unread > 0 && `(${account.unread})`}</Link>
                {account.isOperator && <Link href="/operator" prefetch={false}>Partner workspace</Link>}
                {account.isStaff && <Link href="/admin" prefetch={false}>Admin</Link>}
              </>
            ) : (
              <>
                <Link href="/charter" className="rounded-full bg-paper px-6 py-3 text-center font-medium text-ink">Plan a flight</Link>
                <Link href="/sign-in" className="text-center">Sign in</Link>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
