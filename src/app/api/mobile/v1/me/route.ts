import { body, mobile, must, preflight } from '@/server/mobile/http';
import { getProfile, saveSettings } from '@/server/services/account';

export const OPTIONS = preflight;

export const GET = mobile({ auth: 'required' }, async ({ viewer }) => getProfile(must(viewer)));

/** Same validation as the website's settings page. */
export const PATCH = mobile({ auth: 'required' }, async ({ req, viewer }) => {
  const v = must(viewer);
  await saveSettings(v, await body(req));
  const { viewerFromHeaders } = await import('@/server/auth/viewer');
  return getProfile((await viewerFromHeaders(req.headers)) ?? v);
});
