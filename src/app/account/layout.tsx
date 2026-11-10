import { HeaderOver } from '@/components/cinematic/header-over';
import { scene, SceneImage } from '@/components/cinematic/scene';
import { SiteFooter, SiteHeader } from '@/components/domain/chrome';
import { SubNav } from '@/components/domain/sub-nav';
import { requireViewerPage } from '@/server/auth/viewer';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireViewerPage('/account');
  return (
    <>
      <SiteHeader />
      {/* A slim band of sky: the account is the same film, seen from cruise. */}
      <section className="relative isolate -mt-16 overflow-hidden bg-night">
        <HeaderOver />
        <SceneImage plate={scene('sky-horizon')} sizes="100vw" drift={false} settle={false} />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-night/50 via-night/20 to-night/60" />
        <div className="relative mx-auto max-w-[1320px] px-5 pb-6 pt-28 md:px-12 md:pt-36">
          <SubNav
            label="Account"
            variant="glass"
            items={[
              { href: '/account', label: 'Overview', exact: true },
              { href: '/account/trips', label: 'Trips & requests' },
              { href: '/account/notifications', label: 'Inbox' },
              { href: '/account/listings', label: 'Aircraft listings' },
              { href: '/account/settings', label: 'Settings' },
            ]}
          />
        </div>
      </section>
      <main id="main" className="mx-auto max-w-[1320px] px-5 py-14 md:px-12">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
