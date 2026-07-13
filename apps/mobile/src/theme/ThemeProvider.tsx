import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '@/services/cache';
import type { ColorScheme } from './tokens';

interface ThemeContextValue {
  scheme: ColorScheme;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() ?? 'light';
  const [darkMode, setDarkModeState] = useState(getSetting('darkMode', false));

  const scheme: ColorScheme = darkMode ? 'dark' : system === 'dark' ? 'dark' : 'light';

  const value = useMemo(
    () => ({
      scheme,
      darkMode,
      setDarkMode: (next: boolean) => {
        setDarkModeState(next);
        setSetting('darkMode', next);
      },
    }),
    [scheme, darkMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useAppColorScheme(): ColorScheme {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx.scheme;
  const system = useColorScheme() ?? 'light';
  return getSetting('darkMode', false) ? 'dark' : system === 'dark' ? 'dark' : 'light';
}
