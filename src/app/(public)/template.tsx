import { ViewTransition } from 'react';

/**
 * Re-mounts on navigation. Each route enters as a "scene cut": the old page dissolves with a
 * slight defocus and the new one resolves (CSS: ::view-transition-*(.scene) in globals.css).
 * The header has its own view-transition-name and stays still as the anchor.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition default="scene">
      <div>{children}</div>
    </ViewTransition>
  );
}
