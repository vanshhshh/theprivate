import type { SVGProps } from 'react';

export type IconName = 'horizon' | 'route' | 'ticket' | 'compass' | 'person' | 'arrow-right' | 'bell';

/** A small, consistent line-icon set drawn for ThePrivate (24px grid, round joins). */
const PATHS: Record<IconName, string> = {
  horizon: 'M3 16h18M6.5 16a5.5 5.5 0 0 1 11 0M12 5v2.5M5.2 8.2l1.6 1.6M18.8 8.2l-1.6 1.6M7 19.5h10',
  route: 'M6 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.2 14.6c3.4-1.2 4.3-4.5 7.6-5.6',
  ticket: 'M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5v-2ZM14.5 6v12',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0',
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}
