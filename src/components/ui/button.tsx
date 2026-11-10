import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet' | 'light' | 'glass';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--dur-2)] ease-[var(--ease-approach)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 select-none whitespace-nowrap';
const variants: Record<Variant, string> = {
  primary: 'bg-magenta text-paper hover:bg-magenta-2 shadow-[0_10px_30px_-14px_rgb(163_36_92/0.7)]',
  secondary: 'border border-ink/80 text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink hover:bg-paper-2',
  quiet: 'rounded-none text-sectional underline decoration-line-strong underline-offset-4 hover:decoration-sectional',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-paper',
  /** Paper on photography. */
  light: 'bg-paper text-ink hover:bg-magenta hover:text-paper',
  /** Translucent on photography. */
  glass: 'border border-paper/35 bg-paper/10 text-paper backdrop-blur-md hover:bg-paper/20',
};
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-6 text-[15px]', lg: 'h-14 px-8 text-base' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], variant === 'quiet' ? 'h-auto px-0' : sizes[size], extra);
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant = 'primary', size = 'md', className, arrow, children, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; arrow?: boolean }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
      {arrow && <span className="arrow" aria-hidden>→</span>}
    </Link>
  );
}
