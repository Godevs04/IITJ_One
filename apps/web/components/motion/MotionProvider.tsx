'use client';

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Single root provider for Framer Motion — LazyMotion loads only the
 * domAnimation feature bundle (not the full runtime), and
 * reducedMotion="user" makes every m.* animation in the app automatically
 * honor prefers-reduced-motion without each component checking it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
