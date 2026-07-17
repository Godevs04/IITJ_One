import { LinkButton } from '@/components/ui/Button';
import { AmbientGlow } from './AmbientGlow';
import { TAGLINE } from '@/lib/constants';

export function DownloadCtaBand() {
  return (
    <section className="relative mx-auto max-w-8xl overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-deep via-[#123652] to-indigo px-6 py-14 text-center shadow-glow sm:px-12">
        <AmbientGlow />
        <h2 className="text-2xl font-semibold tracking-tight text-sand sm:text-3xl">{TAGLINE}</h2>
        <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-sand/80 sm:text-base">
          Free for every IIT Jodhpur student, forever.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <LinkButton
            href="/#download"
            variant="marketing"
            className="!bg-none !bg-sand !text-indigo-deep !shadow-none hover:!brightness-95"
          >
            Download IITJ One
          </LinkButton>
          <LinkButton href="/#features" variant="ghost" className="!text-sand hover:!bg-white/10">
            See all features
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
