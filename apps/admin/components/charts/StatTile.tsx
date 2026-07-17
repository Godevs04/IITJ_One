import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter';

/** A single metric tile — value + label, optional delta badge. Used for Overview/Live/Search/Notifications/Performance stat rows. */
export function StatTile({
  label,
  value,
  suffix = '',
  delta,
  tone = 'indigo',
}: {
  label: string;
  value: number | string;
  suffix?: string;
  delta?: number;
  tone?: 'indigo' | 'sandstone' | 'sage' | 'danger';
}) {
  const toneClass = {
    indigo: 'text-indigo',
    sandstone: 'text-sandstone',
    sage: 'text-sage',
    danger: 'text-non-veg',
  }[tone];

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-1.5 font-mono text-2xl font-semibold leading-none tracking-tight ${toneClass}`}>
        {typeof value === 'number' ? <AnimatedCounter value={value} duration={700} /> : value}
        {suffix}
      </p>
      {delta !== undefined ? (
        <p className={`mt-1.5 text-xs font-medium ${delta >= 0 ? 'text-sage' : 'text-non-veg'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs. prior period
        </p>
      ) : null}
    </div>
  );
}
