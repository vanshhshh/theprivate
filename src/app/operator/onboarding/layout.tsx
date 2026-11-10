import { SiteFooter, SiteHeader } from '@/components/domain/chrome';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1000px] px-5 py-12 md:px-8">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
