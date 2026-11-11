import { env } from '@/config/env';
import { PLATES } from '@/components/Plate';
import { InBuild, ScreenHero } from '@/components/ScreenHero';

export function Profile() {
  return (
    <>
      <ScreenHero plate={PLATES.skyHorizon} eyebrow="Profile" title="Your account" />
      <InBuild items={['Sign in, create an account, password recovery', 'Personal details and notification preferences', 'Face ID / fingerprint lock', 'Support, privacy, terms and account deletion']} />
      <p className="strip px-6 pb-10 text-[11px] text-muted">
        v{env.version} · {env.name}
      </p>
    </>
  );
}
