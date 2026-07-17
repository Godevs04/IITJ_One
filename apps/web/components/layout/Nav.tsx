'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LinkButton } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useSearchPalette } from '@/components/search/SearchPaletteContext';
import { PRIMARY_NAV } from '@/lib/constants';

export function Nav() {
  const [open, setOpen] = useState(false);
  const { setOpen: setSearchOpen } = useSearchPalette();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-sand/80 backdrop-blur-md safe-top">
      <nav aria-label="Primary" className="mx-auto flex max-w-8xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 rounded-lg">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-indigo-tint/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search (Ctrl+K)"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm text-muted transition hover:bg-indigo-tint/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40"
          >
            <Search className="h-4 w-4" aria-hidden />
            <kbd className="font-mono text-[10px]">Ctrl K</kbd>
          </button>
          <ThemeToggle />
          <LinkButton href="/#download" variant="primary" className="!px-4 !py-2 text-sm">
            Download
          </LinkButton>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {open ? (
        <div id="mobile-nav" className="border-t border-border/70 bg-sand/95 px-4 pb-6 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-indigo-tint/50"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearchOpen(true);
              }}
              aria-label="Search"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-ink"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
            <ThemeToggle />
            <LinkButton href="/#download" variant="primary" className="flex-1">
              Download
            </LinkButton>
          </div>
        </div>
      ) : null}
    </header>
  );
}
