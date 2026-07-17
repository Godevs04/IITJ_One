import { UtensilsCrossed, Bus, PhoneCall, CalendarDays } from 'lucide-react';
import { GlassPanel } from '@/components/ui/Card';

const available = [
  { Icon: UtensilsCrossed, label: 'Mess menu' },
  { Icon: Bus, label: 'Transport schedules' },
  { Icon: CalendarDays, label: 'Academic calendar' },
  { Icon: PhoneCall, label: 'Emergency contacts' },
];

export function OfflineSection() {
  return (
    <section aria-labelledby="offline-heading" className="mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8">
      <GlassPanel className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">Offline-first, by design</p>
          <h2 id="offline-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Everything, offline
          </h2>
          <p className="mt-3 text-balance text-base text-muted">
            No signal, no problem. IITJ One works the same whether you&apos;re on hostel Wi-Fi, in a basement, or
            completely offline.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {available.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-tint text-indigo">
                <item.Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm font-medium text-ink">{item.label}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </section>
  );
}
