import { ViewTransition } from 'react';

/** Internal workspace: a brief crossfade between screens, never anything that slows work down. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition default="fade">
      <div>{children}</div>
    </ViewTransition>
  );
}
