'use client';

import { useEffect, useState } from 'react';

export function AnimatedCounter({
  value,
  duration = 900,
  className = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}
