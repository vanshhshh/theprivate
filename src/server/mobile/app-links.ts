/**
 * Universal Links (iOS) and App Links (Android): the theprivate.in paths the installed app may open.
 * Everything else (company workspace, admin, invitations, legal) always opens in the browser.
 * Served only once the store identities exist:
 *   APPLE_TEAM_ID                e.g. ABCDE12345 (Apple Developer → Membership)
 *   ANDROID_CERT_SHA256          Play Console → App integrity → app signing key SHA-256 (comma-separated
 *                                if an upload/debug key should also verify)
 *   MOBILE_APP_ID                defaults to in.theprivate.app
 */
export const APP_LINK_PATHS = ['/charter', '/empty-legs/*', '/aircraft-for-sale/*', '/account/trips/*', '/account/bookings/*', '/account/notifications'] as const;

export const mobileAppId = () => process.env.MOBILE_APP_ID || 'in.theprivate.app';

export function appleAppSiteAssociation() {
  const team = process.env.APPLE_TEAM_ID?.trim();
  if (!team || !/^[A-Z0-9]{10}$/.test(team)) return null;
  return {
    applinks: {
      details: [{ appIDs: [`${team}.${mobileAppId()}`], components: APP_LINK_PATHS.map((p) => ({ '/': p })) }],
    },
  };
}

export function androidAssetLinks() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  if (!prints.length) return null;
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: mobileAppId(), sha256_cert_fingerprints: prints } }];
}
