'use client';

import { useRef, type ReactNode, type PointerEvent } from 'react';
import { m, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Lightweight CSS-3D pointer tilt — the practical substitute for a WebGL
 * hero after @react-three/fiber proved incompatible with this stack (see
 * Hero.tsx / design plan §7 note). Same "tilts toward the pointer, springs
 * back" interaction, zero WebGL risk, and honors reduced-motion via
 * MotionConfig at the root (see MotionProvider).
 */
export function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 24 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 24 });

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handlePointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className="[transform-style:preserve-3d]"
    >
      {children}
    </m.div>
  );
}
