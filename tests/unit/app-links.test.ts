import { afterEach, describe, expect, it } from 'vitest';
import { androidAssetLinks, appleAppSiteAssociation } from '@/server/mobile/app-links';

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe('app link verification files', () => {
  it('are not served until the store identities are configured', () => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.ANDROID_CERT_SHA256;
    expect(appleAppSiteAssociation()).toBeNull();
    expect(androidAssetLinks()).toBeNull();
    process.env.APPLE_TEAM_ID = 'not-a-team';
    process.env.ANDROID_CERT_SHA256 = 'AB:CD';
    expect(appleAppSiteAssociation()).toBeNull();
    expect(androidAssetLinks()).toBeNull();
  });
  it('list only customer paths for the configured app', () => {
    process.env.APPLE_TEAM_ID = 'ABCDE12345';
    process.env.ANDROID_CERT_SHA256 = Array.from({ length: 32 }, () => 'a1').join(':');
    const aasa = appleAppSiteAssociation()!;
    expect(aasa.applinks.details[0]!.appIDs).toEqual(['ABCDE12345.in.theprivate.app']);
    const paths = aasa.applinks.details[0]!.components.map((c) => c['/']);
    expect(paths).toContain('/account/trips/*');
    expect(paths.some((p) => p.startsWith('/claim') || p.startsWith('/operator') || p.startsWith('/admin'))).toBe(false);
    const al = androidAssetLinks()!;
    expect(al[0]!.target).toMatchObject({ package_name: 'in.theprivate.app', sha256_cert_fingerprints: [Array.from({ length: 32 }, () => 'A1').join(':')] });
  });
});
