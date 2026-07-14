'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted">
        <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-indigo border-r-transparent" />
        Checking session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-sand">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-10 h-full w-56 shadow-xl">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-sand/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink"
            aria-label="Open navigation"
          >
            Menu
          </button>
          <span className="text-sm font-semibold text-indigo">IITJ One Admin</span>
        </div>
        <div className="mx-auto w-full max-w-6xl animate-fadeIn px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
