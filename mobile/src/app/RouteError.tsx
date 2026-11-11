import { useRouteError } from 'react-router';
import { Button } from '@/components/ui';

/**
 * Shown if a screen fails unexpectedly. No stack traces or technical detail reach the customer;
 * the error is logged to the device console for debugging builds only.
 */
export function RouteError() {
  const err = useRouteError();
  if (import.meta.env.DEV) console.error(err);
  return (
    <div className="flex min-h-full flex-col justify-center bg-paper px-8 text-center" style={{ paddingTop: 'var(--safe-top)' }}>
      <h1 className="font-display text-[30px] leading-tight">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-[32ch] text-[15px] text-ink-2">This screen couldn’t be shown. Your requests and bookings are safe.</p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button onClick={() => window.location.replace('/discover')}>Back to Discover</Button>
      </div>
    </div>
  );
}
