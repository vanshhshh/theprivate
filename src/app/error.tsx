'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-[70svh] max-w-[1320px] flex-col justify-center px-5 py-24 md:px-12">
      <p className="strip mb-5 text-[11px] uppercase tracking-[0.22em] text-magenta">Something went wrong</p>
      <h1 className="font-display max-w-3xl text-[48px] leading-[0.98] md:text-[80px]">A little <em>turbulence.</em></h1>
      <p className="mt-6 max-w-md text-[17px] text-ink-2">The error has been logged. Please try again.</p>
      <button onClick={reset} className="mt-10 h-11 w-fit rounded-full border border-ink/80 px-6 hover:bg-ink hover:text-paper">Try again</button>
    </main>
  );
}
