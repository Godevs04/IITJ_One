import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.25rem] border border-border/80 bg-surface/95 p-4 shadow-card backdrop-blur-sm sm:rounded-[1.35rem] sm:p-5 ${className}`}
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
      className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 ${className || 'mb-5'}`}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted text-balance">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
    <div className="rounded-2xl border border-dashed border-border bg-white/50 px-4 py-10 text-center sm:px-6 sm:py-12">
      <p className="text-base font-medium text-ink">{title}</p>
      {message ? <p className="mt-1 text-sm text-muted">{message}</p> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-white px-4 py-12 text-sm text-muted sm:px-6 sm:py-16">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo border-r-transparent" />
      {label}
    </div>
  );
}

/** Horizontal scroll wrapper for tables / wide editors on small screens. */
export function ScrollX({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-1 overflow-x-auto scroll-thin px-1 ${className}`}>{children}</div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border bg-white px-3 py-1.5 font-medium text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border bg-white px-3 py-1.5 font-medium text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
