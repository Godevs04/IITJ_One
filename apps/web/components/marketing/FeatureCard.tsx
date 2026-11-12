import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { FeatureMeta } from '@/lib/constants';

const accentClasses: Record<FeatureMeta['accent'], string> = {
  sandstone: 'bg-sandstone-tint text-sandstone',
  indigo: 'bg-indigo-tint text-accent',
  dusk: 'bg-dusk/10 text-dusk',
  sage: 'bg-sage/15 text-sage',
  muted: 'bg-sand text-muted',
};

export function FeatureCard({ feature, Icon, href }: { feature: FeatureMeta; Icon: LucideIcon; href?: string }) {
  const card = (
    <div className="group flex h-full flex-col gap-4 rounded-[1.35rem] border border-border/80 bg-surface/90 p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-indigo/40 hover:shadow-elevated sm:p-6">
      <div className="flex items-center justify-between">
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accentClasses[feature.accent]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      {href ? <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-accent" aria-hidden /> : null}
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
      </div>
    </div>
  );

  if (!href) return card;
  return (
    <Link href={href} className="block h-full rounded-[1.35rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40">
      {card}
    </Link>
  );
}
