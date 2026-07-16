import type { LucideIcon } from 'lucide-react';
import type { FeatureMeta } from '@/lib/constants';

const accentClasses: Record<FeatureMeta['accent'], string> = {
  sandstone: 'bg-sandstone-tint text-sandstone',
  indigo: 'bg-indigo-tint text-indigo',
  dusk: 'bg-dusk/10 text-dusk',
  sage: 'bg-sage/15 text-sage',
  muted: 'bg-sand text-muted',
};

export function FeatureCard({ feature, Icon }: { feature: FeatureMeta; Icon: LucideIcon }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.35rem] border border-border/80 bg-surface/90 p-5 shadow-card backdrop-blur-sm transition duration-300 hover:-translate-y-1.5 hover:border-indigo/20 hover:shadow-elevated">
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accentClasses[feature.accent]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
        <p className="mt-1 text-sm text-muted">{feature.description}</p>
      </div>
    </div>
  );
}
