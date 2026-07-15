'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Dev-mode chunk URLs (webpack.js, app-pages-internals.js, ...) aren't
      // content-hashed and get reused across restarts, so a cache-first SW
      // from an earlier session serves stale JS against the new build's
      // module graph — surfaces as "Cannot read properties of undefined
      // (reading 'call')". Actively unregister so a previously-installed
      // SW from a prior dev session can't keep intercepting requests.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => void reg.unregister());
      });
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // Silent — PWA is progressive enhancement
      }
    };

    void register();
  }, []);

  return null;
}
