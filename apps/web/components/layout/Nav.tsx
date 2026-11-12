'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LinkButton } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useSearchPalette } from '@/components/search/SearchPaletteContext';
import { PRIMARY_NAV, FEATURES } from '@/lib/constants';
import { featurePageFor } from '@/lib/featurePages';
import { FEATURE_ICONS } from '@/lib/featureIcons';

export function Nav() {
  const [open, setOpen] = useState(false);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const facilitiesRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { setOpen: setSearchOpen } = useSearchPalette();

  useEffect(() => {
    setOpen(false);
    setFacilitiesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open && !facilitiesOpen) return;
    function dismiss(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFacilitiesOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (open) menuRef.current?.focus();
      else facilitiesRef.current?.focus();
      setOpen(false);
      setFacilitiesOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open, facilitiesOpen]);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border/70 bg-sand/95 backdrop-blur-md safe-top" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false);
        setFacilitiesOpen(false);
      }
    }}>
      <nav aria-label="Primary" className="mx-auto flex max-w-8xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 rounded-lg">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <button
            ref={facilitiesRef}
            type="button"
            aria-expanded={facilitiesOpen}
            aria-controls="facilities-nav"
            onClick={() => setFacilitiesOpen((value) => !value)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-ink hover:bg-indigo-tint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40"
          >
            All facilities <ChevronDown className={`h-4 w-4 transition ${facilitiesOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {PRIMARY_NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              onClick={() => setFacilitiesOpen(false)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-indigo-tint/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 ${pathname === item.href ? 'bg-indigo-tint text-accent' : 'text-muted'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => { setFacilitiesOpen(false); setSearchOpen(true); }}
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
          ref={menuRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-indigo-tint/50 focus-visible:ring-2 focus-visible:ring-indigo/40 lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {facilitiesOpen ? (
        <div id="facilities-nav" className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-6rem)] overflow-y-auto border-b border-border bg-surface shadow-elevated lg:block" data-lenis-prevent>
          <div className="mx-auto max-w-8xl px-8 py-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Explore campus essentials</p>
              <Link href="/#features" onClick={() => setFacilitiesOpen(false)} className="text-sm font-medium text-accent">View all facilities →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FEATURES.map((feature) => {
                const page = featurePageFor(feature.key);
                const Icon = FEATURE_ICONS[feature.key];
                if (!page) return null;
                return (
                  <Link key={feature.key} href={`/${page.slug}`} aria-current={pathname === `/${page.slug}` ? 'page' : undefined} onClick={() => setFacilitiesOpen(false)} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-indigo-tint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                    <span><span className="block text-sm font-semibold text-ink">{feature.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{feature.oneLiner}</span></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div id="mobile-nav" className="absolute inset-x-0 top-full max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain border-b border-t border-border bg-surface px-4 pb-6 pt-2 shadow-elevated lg:hidden" data-lenis-prevent>
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? 'page' : undefined}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-indigo-tint/50"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <p className="mb-2 mt-4 px-3 text-xs font-semibold uppercase tracking-widest text-muted">Campus facilities</p>
          <div className="grid grid-cols-2 gap-1">
            {FEATURES.filter((feature) => feature.key !== 'transport').map((feature) => {
              const page = featurePageFor(feature.key);
              if (!page) return null;
              return <Link key={feature.key} href={`/${page.slug}`} onClick={() => setOpen(false)} aria-current={pathname === `/${page.slug}` ? 'page' : undefined} className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-ink hover:bg-indigo-tint/50">{feature.title}</Link>;
            })}
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
            <Link href="/#download" onClick={() => setOpen(false)} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary">
              Download
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
