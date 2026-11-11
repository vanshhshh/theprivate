import type { SVGProps } from 'react';

export type IconName = 'horizon' | 'route' | 'ticket' | 'compass' | 'person' | 'arrow-right' | 'bell' | 'chevron-left' | 'chevron-right' | 'close' | 'search' | 'swap' | 'plane' | 'minus' | 'plus' | 'share' | 'check' | 'clock' | 'seat' | 'wifi-off';

/** A small, consistent line-icon set drawn for ThePrivate (24px grid, round joins). */
const PATHS: Record<IconName, string> = {
  horizon: 'M3 16h18M6.5 16a5.5 5.5 0 0 1 11 0M12 5v2.5M5.2 8.2l1.6 1.6M18.8 8.2l-1.6 1.6M7 19.5h10',
  route: 'M6 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.2 14.6c3.4-1.2 4.3-4.5 7.6-5.6',
  ticket: 'M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5v-2ZM14.5 6v12',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  swap: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  plane: 'M3 13.5l7-1.5L14 4h2l-2 8 5-1 1.5-2H22l-1 4 1 4h-1.5L19 15l-5-1 2 8h-2l-4-8-7-1.5Z',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  check: 'M5 12.5l4.5 4.5L19 7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  seat: 'M7 4v9a2 2 0 0 0 2 2h7l2 5M7 13h9M5 20h6',
  'wifi-off': 'M2 8.8a15 15 0 0 1 4.2-2.5M10.7 5.1A15 15 0 0 1 22 8.8M5 12.6a10 10 0 0 1 3.2-1.9M13.8 10.2A10 10 0 0 1 19 12.6M8.5 16.1a5 5 0 0 1 5.6-.6M12 20h.01M3 3l18 18',
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}
