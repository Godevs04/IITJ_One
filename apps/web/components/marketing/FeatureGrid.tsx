import { FEATURES } from '@/lib/constants';
import Link from 'next/link';
import { featurePageFor } from '@/lib/featurePages';
import { FEATURE_ICONS } from '@/lib/featureIcons';
import { FeatureCard } from './FeatureCard';
import { Reveal } from '@/components/motion/Reveal';

export function FeatureGrid() {
  return (
    <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-8xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">Everything, in one app</p>
        <h2 id="features-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Every campus essential, built in
        </h2>
        <p className="mt-3 text-base text-muted">
          Plan a meal, find a ride, or look up a campus contact. Choose a guide to see what’s available in the app.
        </p>
      </div>
      <nav aria-label="IIT Jodhpur campus information" className="mt-6 flex flex-wrap gap-3">
        <Link href="/iit-jodhpur" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-accent hover:border-indigo/40">IIT Jodhpur campus guide →</Link>
        <Link href="/iit-jodhpur-departments" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-accent hover:border-indigo/40">Departments & faculty →</Link>
      </nav>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.key} delay={(index % 3) * 0.06}>
            <FeatureCard
              feature={feature}
              Icon={FEATURE_ICONS[feature.key]}
              href={featurePageFor(feature.key) ? `/${featurePageFor(feature.key)!.slug}` : undefined}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
