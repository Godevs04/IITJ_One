'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface SearchPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SearchPaletteContext = createContext<SearchPaletteContextValue | null>(null);

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return <SearchPaletteContext.Provider value={value}>{children}</SearchPaletteContext.Provider>;
}

export function useSearchPalette(): SearchPaletteContextValue {
  const ctx = useContext(SearchPaletteContext);
  if (!ctx) throw new Error('useSearchPalette must be used within SearchPaletteProvider');
  return ctx;
}
