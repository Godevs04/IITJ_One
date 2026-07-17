import { AnimatedCounter } from './AnimatedCounter';

export function StatTile({
  value,
  suffix = '',
  label,
  className = '',
}: {
  value: number;
  suffix?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-md ${className}`}>
      <p className="font-mono text-2xl font-semibold text-sand">
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
      <p className="mt-1 text-xs text-sand/70">{label}</p>
    </div>
  );
}
