import { SiteFooter, SiteHeader } from '@/components/domain/chrome';
import { LinkButton } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex min-h-[70svh] max-w-[1320px] flex-col justify-center px-5 py-24 md:px-12">
        <p className="strip mb-5 text-[11px] uppercase tracking-[0.22em] text-magenta">404</p>
        <h1 className="font-display max-w-3xl text-[48px] leading-[0.98] md:text-[88px]">Off the <em>chart.</em></h1>
        <p className="mt-6 max-w-md text-[17px] text-ink-2">This page does not exist, or it is no longer available.</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <LinkButton href="/" arrow>Back to home</LinkButton>
          <LinkButton href="/charter" variant="secondary">Plan a flight</LinkButton>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
