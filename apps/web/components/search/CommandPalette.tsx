'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { searchEntries, type SearchEntry } from '@/lib/searchIndex';
import { useSearchPalette } from './SearchPaletteContext';

export function CommandPalette() {
  const { open, setOpen } = useSearchPalette();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => searchEntries(query), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, [setOpen]);

  const navigate = useCallback(
    (entry: SearchEntry) => {
      router.push(entry.href);
      close();
    },
    [router, close],
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-24 backdrop-blur-sm"
      role="presentation"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site search"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && results[activeIndex]) {
                navigate(results[activeIndex]);
              }
            }}
            placeholder="Search pages, features, FAQs…"
            aria-label="Search"
            aria-controls="command-palette-results"
            aria-activedescendant={results[activeIndex] ? `cp-result-${activeIndex}` : undefined}
            role="combobox"
            aria-expanded
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button type="button" onClick={close} aria-label="Close search" className="text-muted hover:text-ink">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ul id="command-palette-results" role="listbox" className="max-h-80 overflow-y-auto scroll-thin py-2">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted">No results</li>
          ) : (
            results.map((entry, index) => (
              <li
                key={`${entry.group}-${entry.href}-${entry.title}`}
                id={`cp-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => navigate(entry)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition ${
                    index === activeIndex ? 'bg-indigo-tint/60' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {entry.title}
                    <span className="text-[10px] uppercase tracking-wide text-muted">{entry.group}</span>
                  </span>
                  <span className="line-clamp-1 text-xs text-muted">{entry.description}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
