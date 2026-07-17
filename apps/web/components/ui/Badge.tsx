type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const tones: Record<Tone, string> = {
  success: 'bg-sage/15 text-sage',
  warning: 'bg-sandstone-tint text-sandstone',
  danger: 'bg-non-veg/10 text-non-veg',
  info: 'bg-indigo-tint text-indigo',
  neutral: 'bg-sand text-muted',
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}
