'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <span
        className={`absolute left-0 top-0 block h-0.5 w-full rounded-full bg-ink transition-transform duration-200 ${
          open ? 'translate-y-[7px] rotate-45' : ''
        }`}
      />
      <span
        className={`absolute left-0 top-[7px] block h-0.5 w-full rounded-full bg-ink transition-opacity duration-200 ${
          open ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <span
        className={`absolute left-0 top-[14px] block h-0.5 w-full rounded-full bg-ink transition-transform duration-200 ${
          open ? '-translate-y-[7px] -rotate-45' : ''
        }`}
      />
    </span>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 text-sm text-muted">
        <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-indigo border-r-transparent" />
        Checking session…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop / large tablet sidebar */}
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Mobile / tablet drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-ink/45 backdrop-blur-[2px] transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`relative z-10 h-full w-[min(18rem,88vw)] shadow-glow transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onNavigate={() => setMenuOpen(false)} className="w-full max-w-none" />
        </div>
      </div>

      <main className="scroll-thin min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-sand/85 px-3 py-2.5 backdrop-blur-xl safe-top sm:px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface shadow-card transition hover:shadow-soft"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
          >
            <MenuIcon open={menuOpen} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-indigo">IITJ One Admin</p>
            <p className="truncate text-[11px] text-muted">Campus console</p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-3 py-4 safe-bottom sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
