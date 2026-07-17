import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getSetting, setSetting } from '@/services/cache';
import { getThemeColors, type ColorScheme, type ThemeColors } from './tokens';
import { updateUserProperty } from '@/services/firebase';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: ThemeColors;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(getSetting('darkMode', false));
  const scheme: ColorScheme = darkMode ? 'dark' : 'light';
  const colors = useMemo(() => getThemeColors(scheme), [scheme]);

  const value = useMemo(
    () => ({
      scheme,
      colors,
      darkMode,
      setDarkMode: (next: boolean) => {
        setDarkModeState(next);
        setSetting('darkMode', next);
        updateUserProperty('theme', next ? 'dark' : 'light');
      },
    }),
    [scheme, colors, darkMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

export function useAppColorScheme(): ColorScheme {
  return useTheme().scheme;
}
