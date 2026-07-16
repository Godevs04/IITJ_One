'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Scroll-triggered fade/rise for section-level reveals. Relies on the root
 * MotionProvider (components/motion/MotionProvider.tsx) for the LazyMotion
 * feature bundle and prefers-reduced-motion handling — don't wrap this in
 * its own LazyMotion, that defeats the shared-bundle point of using it once.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 24, delay }}
      className={className}
    >
      {children}
    </m.div>
  );
}
