import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.35rem] border border-border/80 bg-surface/95 p-5 shadow-card backdrop-blur-sm dark:bg-surface/80 ${className}`}
    >
      {children}
    </div>
  );
}

export function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-border bg-white/90 p-7 shadow-elevated backdrop-blur dark:bg-surface/80 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-3xl ${className}`}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-3 text-balance text-base text-muted sm:text-lg">{subtitle}</p> : null}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white/50 px-4 py-10 text-center dark:bg-white/5 sm:px-6 sm:py-12">
      <p className="text-base font-medium text-ink">{title}</p>
      {message ? <p className="mt-1 text-sm text-muted">{message}</p> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-2xl border border-border bg-white px-4 py-12 text-sm text-muted dark:bg-white/5 sm:px-6 sm:py-16 ${className}`}
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo border-r-transparent" />
      {label}
    </div>
  );
}
