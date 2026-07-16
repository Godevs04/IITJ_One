import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // rgb(var(--x) / <alpha-value>) is the pattern Tailwind needs to
        // generate opacity-modifier utilities (e.g. text-sand/70) for
        // CSS-variable-based colors — see app/globals.css for the vars
        // themselves (stored as space-separated RGB channels, not hex).
        indigo: {
          DEFAULT: 'rgb(var(--color-indigo) / <alpha-value>)',
          deep: 'rgb(var(--color-indigo-deep) / <alpha-value>)',
          tint: 'rgb(var(--color-indigo-tint) / <alpha-value>)',
        },
        sandstone: {
          DEFAULT: 'rgb(var(--color-sandstone) / <alpha-value>)',
          tint: 'rgb(var(--color-sandstone-tint) / <alpha-value>)',
        },
        dusk: 'rgb(var(--color-dusk) / <alpha-value>)',
        sand: 'rgb(var(--color-sand) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        sage: 'rgb(var(--color-sage) / <alpha-value>)',
        'non-veg': 'rgb(var(--color-non-veg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '5xl': ['3rem', { lineHeight: '1.05' }],
        '6xl': ['3.75rem', { lineHeight: '1.02' }],
      },
      maxWidth: {
        '8xl': '90rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26, 34, 41, 0.04), 0 8px 24px rgba(29, 63, 94, 0.05)',
        elevated: '0 18px 40px -16px rgba(29, 63, 94, 0.22)',
        soft: '0 10px 28px -12px rgba(26, 34, 41, 0.18)',
        glow: '0 24px 60px -20px rgba(0, 41, 71, 0.55)',
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
