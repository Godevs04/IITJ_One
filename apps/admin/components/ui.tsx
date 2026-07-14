import { type ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.35rem] border border-border/80 bg-surface/95 p-5 shadow-card backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4 ${className || 'mb-5'}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 sm:pt-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) {
  const tones = {
    success: 'bg-sage/15 text-sage',
    warning: 'bg-sandstone-tint text-sandstone',
    danger: 'bg-non-veg/10 text-non-veg',
    info: 'bg-indigo-tint text-indigo',
    neutral: 'bg-sand text-muted',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white/50 px-6 py-12 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      {message ? <p className="mt-1 text-sm text-muted">{message}</p> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-white px-6 py-16 text-sm text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo border-r-transparent" />
      {label}
    </div>
  );
}
