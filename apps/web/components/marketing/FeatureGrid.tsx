import { FEATURES } from '@/lib/constants';
import { FEATURE_ICONS } from '@/lib/featureIcons';
import { FeatureCard } from './FeatureCard';
import { Reveal } from '@/components/motion/Reveal';

export function FeatureGrid() {
  return (
    <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">Everything, in one app</p>
        <h2 id="features-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Every campus essential, built in
        </h2>
        <p className="mt-3 text-base text-muted">
          Everything a student needs for campus life, in one consistently designed app.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.key} delay={(index % 3) * 0.06}>
            <FeatureCard feature={feature} Icon={FEATURE_ICONS[feature.key]} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
