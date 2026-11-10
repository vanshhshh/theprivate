'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

const CLIMB = [0.22, 1, 0.36, 1] as const;

/**
 * Choreographed entrance driven by CSS scroll timelines (see .reveal in globals.css):
 * content is fully visible without JS or where unsupported; the stagger is a per-index
 * offset in the animation range, capped so long lists never feel slow.
 */
export function Reveal({ children, index = 0, className, as: Comp = 'div' }: { children: ReactNode; index?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  return (
    <Comp className={`reveal ${className ?? ''}`} style={{ ['--reveal-i' as string]: Math.min(index, 8) }}>
      {children}
    </Comp>
  );
}

/**
 * Departure-board digits: each changed character rolls in. Short (≤ 300 ms), mono,
 * announced politely to screen readers as the final value only.
 */
export function FlapText({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`strip relative inline-flex overflow-hidden ${className ?? ''}`} aria-live="polite" aria-label={value}>
      {value.split('').map((ch, i) => (
        <span key={i} className="relative inline-block" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ch}
              className="inline-block"
              initial={reduce ? false : { y: '-70%', opacity: 0, rotateX: 80 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={reduce ? undefined : { y: '70%', opacity: 0, rotateX: -80 }}
              transition={{ duration: 0.24, ease: CLIMB, delay: i * 0.012 }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
