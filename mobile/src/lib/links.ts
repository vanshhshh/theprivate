/**
 * Maps a theprivate.in path to the app screen that shows it, or null when it belongs on the web
 * (company workspace, admin, legal). Used by the inbox, push notifications and deep links.
 * Only known shapes are accepted; anything else is never navigated to.
 */
const REF = /^[A-Z]{2}-[A-Z0-9]{4,12}$/;
const ID = /^[A-Za-z0-9_-]{6,40}$/;

export function appPathFor(webPath: string): string | null {
  let url: URL;
  try {
    url = new URL(webPath, 'https://theprivate.in');
  } catch {
    return null;
  }
  if (url.origin !== 'https://theprivate.in') return null;
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const parts = p.split('/').filter(Boolean);
  const [a, b, c] = parts;

  if (p === '/') return '/discover';
  if (p === '/charter' || p === '/charter/request') return '/plan';
  if (a === 'empty-legs' && !b) return '/explore';
  if (a === 'empty-legs' && b && ID.test(b) && parts.length === 2) return `/explore/one-way/${b}`;
  if (a === 'aircraft-for-sale' && !b) return '/explore?tab=aircraft';
  if (a === 'aircraft-for-sale' && b && /^[a-z0-9-]{3,120}$/i.test(b) && parts.length === 2) return `/explore/aircraft/${b}`;
  if (a === 'account' && !b) return '/journeys';
  if (a === 'account' && b === 'trips' && !c) return '/journeys';
  if (a === 'account' && b === 'trips' && c && REF.test(c)) return `/journeys/request/${c}`;
  if (a === 'account' && b === 'bookings' && c && REF.test(c)) return `/journeys/booking/${c}`;
  if (a === 'account' && b === 'notifications') return '/inbox';
  if (a === 'account' && b === 'settings') return '/profile';
  if (a === 'sign-in') return '/auth/sign-in';
  if (a === 'sign-up') return '/auth/sign-up';
  return null;
}
