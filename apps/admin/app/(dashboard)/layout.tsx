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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

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
      <div className="sticky top-0 h-screen shrink-0">
        <Sidebar />
      </div>
      <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl animate-fadeIn px-6 py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
