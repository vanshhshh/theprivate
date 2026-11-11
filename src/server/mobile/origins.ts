/**
 * Origins of the ThePrivate mobile app (Capacitor serves the bundled app locally):
 *   iOS     capacitor://localhost
 *   Android https://localhost
 * Development adds the Vite dev server. No other cross-origin caller is allowed.
 */
export const MOBILE_APP_ORIGINS: string[] = [
  'capacitor://localhost',
  'https://localhost',
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5174']),
];

export function isMobileOrigin(origin: string | null): origin is string {
  return !!origin && MOBILE_APP_ORIGINS.includes(origin);
}
