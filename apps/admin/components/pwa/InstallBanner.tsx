'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('iitj-admin-pwa-dismissed') === '1') return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-fadeIn rounded-2xl border border-border bg-surface/95 p-4 shadow-glow backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:left-auto sm:w-[360px]">
      <p className="text-sm font-semibold text-ink">Install IITJ Admin</p>
      <p className="mt-1 text-xs text-muted">
        Add to your home screen for a full-screen app experience.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          onClick={async () => {
            await deferred.prompt();
            setHidden(true);
            setDeferred(null);
          }}
        >
          Install
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            localStorage.setItem('iitj-admin-pwa-dismissed', '1');
            setHidden(true);
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
