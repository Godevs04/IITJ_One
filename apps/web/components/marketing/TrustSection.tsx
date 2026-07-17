import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from './AnimatedCounter';
import { Reveal } from '@/components/motion/Reveal';
import { FEATURES } from '@/lib/constants';

const stats = [
  { value: FEATURES.length, suffix: '', label: 'Campus essentials' },
  { value: 100, suffix: '%', label: 'Offline-first' },
  { value: 0, suffix: '', label: 'Accounts required' },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8">
      <h2 id="trust-heading" className="sr-only">
        Why IITJ One
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.06}>
            <Card className="text-center">
              <p className="font-mono text-3xl font-semibold text-indigo">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm text-muted">{stat.label}</p>
            </Card>
          </Reveal>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-ink">Built to last</p>
          <p className="mt-1 text-sm text-muted">Reliable and stable, so it&apos;s there when you need it.</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Privacy-first</p>
          <p className="mt-1 text-sm text-muted">
            Anonymous by design — no personal names, no phone numbers, no Mess QR images, ever collected.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Built for this campus</p>
          <p className="mt-1 text-sm text-muted">
            Every module — mess, transport, laundry — mirrors how IIT Jodhpur students actually use campus services.
          </p>
        </Card>
      </div>
    </section>
  );
}
