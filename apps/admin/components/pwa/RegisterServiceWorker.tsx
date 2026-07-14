'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Dev: keep unregister optional — still register so installability works on localhost
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
