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
        // Brand fills (hex so opacity modifiers work): primary #3DA9D8 with near-black text, secondary #F1FF0A.
        primary: '#3DA9D8',
        'on-primary': '#01050D',
        highlight: '#F1FF0A',
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
        // Helvetica Neue — the IITJ One typeface, same as the app and website.
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(1, 5, 13, 0.04), 0 8px 24px rgba(1, 5, 13, 0.05)',
        elevated: '0 18px 40px -16px rgba(1, 5, 13, 0.22)',
        soft: '0 10px 28px -12px rgba(1, 5, 13, 0.18)',
        glow: '0 24px 60px -20px rgba(61, 169, 216, 0.45)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(10px) translateX(-8px)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out',
        float: 'float 9s ease-in-out infinite',
        'float-delayed': 'float-delayed 11s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
