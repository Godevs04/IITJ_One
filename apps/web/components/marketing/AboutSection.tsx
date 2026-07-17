import { ShieldAlert } from 'lucide-react';
import { DISCLAIMER, MISSION } from '@/lib/constants';

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-heading" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">About</p>
      <h2 id="about-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        A campus companion, not a social platform
      </h2>
      <p className="mt-3 text-balance text-base text-muted">{MISSION}</p>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink">
        <p>
          IITJ One started as a simple question: why does finding today&apos;s mess menu, the next bus, or an
          emergency contact take more taps than it should? The app exists to answer that — one place for the
          campus information every IIT Jodhpur student checks daily, built with the same care that goes into
          apps students actually enjoy using.
        </p>
        <p>
          It is deliberately narrow in scope. Rather than trying to be everything, it stays focused on
          information — quick, reliable, and available offline.
        </p>
      </div>

      <div className="mt-8 flex gap-3 rounded-2xl border border-dusk/30 bg-dusk/5 p-5">
        <ShieldAlert className="h-5 w-5 shrink-0 text-dusk" aria-hidden />
        <p className="text-sm text-ink">{DISCLAIMER}</p>
      </div>
    </section>
  );
}
