import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Bus, UtensilsCrossed, HeartPulse, MapPinned, WifiOff, UserRoundCheck } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { AmbientGlow } from './AmbientGlow';
import { FEATURES } from '@/lib/constants';

function CampusShortcuts() {
  const shortcuts = [
    { title: 'What’s on the menu?', label: 'Mess menus & meal details', href: '/iit-jodhpur-mess-menu', Icon: UtensilsCrossed },
    { title: 'Plan your next ride', label: 'Bus schedules & transport', href: '/iit-jodhpur-bus-timings', Icon: Bus },
    { title: 'Find your way around', label: 'Campus directory & map', href: '/iit-jodhpur-campus-directory', Icon: MapPinned },
    { title: 'Keep care close', label: 'Health Center & contacts', href: '/iit-jodhpur-health-center', Icon: HeartPulse },
  ];
  return (
    <div className="relative mx-auto w-full max-w-lg rounded-[2rem] border border-white/10 brand-panel p-5 shadow-glow sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/60">Your campus companion</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-cream">A little less searching.</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-highlight text-navy"><MapPinned className="h-5 w-5" aria-hidden /></span>
      </div>
      <nav aria-label="Popular campus guides" className="mt-4 space-y-2">
        {shortcuts.map(({ title, label, href, Icon }) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition hover:border-primary/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-cream">{title}</span><span className="mt-0.5 block text-xs text-cream/60">{label}</span></span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-cream/50 transition group-hover:text-primary" aria-hidden />
          </Link>
        ))}
      </nav>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-cream/60">
        <span>{FEATURES.length} campus essentials. One app.</span>
        <Link href="/#features" className="font-medium text-primary hover:text-cream">Explore them all →</Link>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <AmbientGlow variant="hero" />
      <div className="relative mx-auto grid max-w-8xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:py-20 lg:px-8">
        <div className="reveal">
          <p className="inline-flex rounded-full border border-indigo/20 bg-indigo-tint/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Built for life at IIT Jodhpur
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Your campus.<br /><span className="text-accent">Your day.</span> One app.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base text-muted sm:text-lg">
            From your next meal to your next bus, find the everyday details that make campus life easier.
            Mess menus, transport, notices, and more — together in IITJ One.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/#download" variant="marketing">
              Download the app
            </LinkButton>
            <LinkButton href="/#features" variant="secondary">
              Explore campus facilities <ArrowDown className="h-4 w-4" aria-hidden />
            </LinkButton>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><UserRoundCheck className="h-4 w-4 text-accent" aria-hidden />No account needed</span>
            <span className="inline-flex items-center gap-1.5"><WifiOff className="h-4 w-4 text-accent" aria-hidden />Saved essentials work offline</span>
          </div>
        </div>

        <div className="reveal [animation-delay:120ms]">
          <CampusShortcuts />
        </div>
      </div>
    </section>
  );
}
