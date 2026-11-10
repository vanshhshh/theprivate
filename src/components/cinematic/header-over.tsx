'use client';

import { useEffect, useRef } from 'react';

/** Scenes currently under the header. Shared so overlapping mounts during a route transition don't race. */
const active = new Set<symbol>();
const sync = () => {
  if (active.size) document.documentElement.dataset.header = 'over';
  else delete document.documentElement.dataset.header;
};

/**
 * Renders nothing; observes its parent scene. While the scene sits behind the header, the header
 * turns transparent with paper type (CSS: html[data-header='over'] .site-header).
 */
export function HeaderOver() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const scene = ref.current?.parentElement;
    if (!scene) return;
    const id = Symbol('scene');
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) active.add(id);
        else active.delete(id);
        sync();
      },
      // Only a thin strip at the top of the viewport (under the 64px header) counts.
      { rootMargin: '0px 0px -94% 0px', threshold: 0 },
    );
    io.observe(scene);
    return () => {
      io.disconnect();
      active.delete(id);
      sync();
    };
  }, []);
  return <span ref={ref} hidden />;
}
