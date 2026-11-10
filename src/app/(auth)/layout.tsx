import Link from 'next/link';
import { scene, SceneImage } from '@/components/cinematic/scene';
import { Wordmark } from '@/components/domain/chrome';

/** Sign in / create account: a quiet form on paper beside the cabin, like boarding. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col px-6 py-8 md:px-14">
        <Link href="/" aria-label="ThePrivate home"><Wordmark /></Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">{children}</div>
        <p className="text-xs text-muted">ThePrivate arranges flights with licensed air operators.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-night lg:block">
        <SceneImage plate={scene('cabin-warm')} sizes="55vw" priority drift={false} />
        <div aria-hidden className="scene-grade absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-paper">
          <p className="strip mb-4 text-[11px] uppercase tracking-[0.22em] text-dusk">Your journeys, in one place</p>
          <p className="font-display max-w-md text-[44px] leading-[1.02]">
            Requests, offers and trips. <em>Ready when you are.</em>
          </p>
        </div>
      </div>
    </main>
  );
}
