import Link from 'next/link';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'marketing';

const styles: Record<Variant, string> = {
  primary: 'bg-indigo text-sand hover:bg-indigo-deep active:scale-[0.98] shadow-card',
  secondary:
    'bg-white/80 text-indigo border border-border hover:bg-indigo-tint/60 active:scale-[0.98] dark:bg-surface/60',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-white/60 dark:hover:bg-white/5',
  marketing:
    'bg-gradient-to-br from-indigo-deep via-[#123652] to-indigo text-sand shadow-glow hover:brightness-110 active:scale-[0.98]',
};

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 disabled:cursor-not-allowed disabled:opacity-50';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  children,
  className = '',
  external,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${styles[variant]} ${className}`}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
