/**
 * Build-time environment. Only PUBLIC configuration belongs here: the bundle ships to every phone.
 * Never put secrets (Razorpay, database, SMTP, service accounts) in the mobile app.
 *
 *   vite build                    → production  → https://theprivate.in
 *   vite build --mode development → development → VITE_API_BASE_URL or the Android emulator's host
 *   vite build --mode preview     → preview     → VITE_API_BASE_URL (a Vercel preview URL)
 */
export type AppEnvironment = 'development' | 'preview' | 'production';

const PRODUCTION_API = 'https://theprivate.in';
// 10.0.2.2 is the host machine as seen from the Android emulator.
const DEV_DEFAULT_API = 'http://10.0.2.2:3000';

function resolve(): { name: AppEnvironment; apiBaseUrl: string } {
  const mode = import.meta.env.MODE;
  const override = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (mode === 'production') {
    // Release builds are pinned to production; an override can never point them at a dev server.
    return { name: 'production', apiBaseUrl: PRODUCTION_API };
  }
  if (mode === 'preview') {
    if (!override?.startsWith('https://')) throw new Error('Preview builds need VITE_API_BASE_URL=https://…');
    return { name: 'preview', apiBaseUrl: override };
  }
  return { name: 'development', apiBaseUrl: override || DEV_DEFAULT_API };
}

export const env = { ...resolve(), version: __APP_VERSION__ } as const;

declare global {
  const __APP_VERSION__: string;
}
