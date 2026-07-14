import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          DEFAULT: 'var(--color-indigo)',
          deep: 'var(--color-indigo-deep)',
          tint: 'var(--color-indigo-tint)',
        },
        sandstone: {
          DEFAULT: 'var(--color-sandstone)',
          tint: 'var(--color-sandstone-tint)',
        },
        dusk: 'var(--color-dusk)',
        sand: 'var(--color-sand)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        sage: 'var(--color-sage)',
        'non-veg': 'var(--color-non-veg)',
        surface: 'var(--color-surface)',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(34, 41, 47, 0.06), 0 1px 2px rgba(34, 41, 47, 0.04)',
        elevated: '0 8px 24px rgba(29, 63, 94, 0.08)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
