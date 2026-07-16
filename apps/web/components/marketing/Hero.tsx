import { ChevronDown } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { AmbientGlow } from './AmbientGlow';
import { StatTile } from './StatTile';
import { TiltCard } from '@/components/motion/TiltCard';
import { TAGLINE, FEATURES } from '@/lib/constants';

function HeroStatCard() {
  return (
    <div className="relative mx-auto max-w-sm rounded-[2rem] bg-gradient-to-br from-indigo-deep via-[#123652] to-indigo p-6 shadow-glow sm:p-8">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/10" aria-hidden />
      <div className="absolute -bottom-8 -left-6 h-16 w-16 rounded-full border border-white/10" aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand/70">At a glance</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile value={FEATURES.length} label="Campus essentials" />
        <StatTile value={100} suffix="%" label="Offline-first" />
        <StatTile value={0} label="Accounts required" />
        <StatTile value={0} label="Ads, ever" />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <AmbientGlow variant="hero" />
      <div className="relative mx-auto grid max-w-8xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
        <div className="reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">
            Campus companion for IIT Jodhpur
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {TAGLINE}
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base text-muted sm:text-lg">
            Mess menu, transport, notices, calendar, laundry, Wi-Fi, and emergency contacts —
            all offline-first, all in one app. No account, no login.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/#download" variant="marketing">
              Download the app
            </LinkButton>
            <LinkButton href="/#features" variant="secondary">
              See all features
            </LinkButton>
          </div>
        </div>

        <div className="reveal [animation-delay:120ms]">
          <TiltCard>
            <HeroStatCard />
          </TiltCard>
        </div>
      </div>
      <div className="relative flex justify-center pb-8">
        <ChevronDown className="h-5 w-5 animate-float text-muted" aria-hidden />
      </div>
    </section>
  );
}
