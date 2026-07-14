'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { apiFetch, fetchCampusModule } from '@/lib/api';
import type { MetaDoc, SuggestionDoc } from '@/lib/types';
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter';
import {
  IconArrow,
  IconInbox,
  IconMenu,
  IconNotices,
  IconSpark,
  IconSync,
  IconTransport,
} from '@/components/dashboard/icons';

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

const QUICK: {
  href: string;
  title: string;
  desc: string;
  accent: string;
  glow: string;
  Icon: IconComp;
}[] = [
  {
    href: '/menu',
    title: 'Mess Menu',
    desc: 'Edit day × meal, import CSV, publish.',
    accent: 'from-[#1d3f5e] to-[#345a7a]',
    glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(29,63,94,0.45)]',
    Icon: IconMenu,
  },
  {
    href: '/notices',
    title: 'Notices',
    desc: 'Create campus announcements.',
    accent: 'from-[#c68642] to-[#e0a45e]',
    glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(198,134,66,0.45)]',
    Icon: IconNotices,
  },
  {
    href: '/transport',
    title: 'Transport',
    desc: 'Update shuttle routes & times.',
    accent: 'from-[#e2703a] to-[#f08a58]',
    glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(226,112,58,0.4)]',
    Icon: IconTransport,
  },
  {
    href: '/suggestions',
    title: 'Suggestions',
    desc: 'Read anonymous student inbox.',
    accent: 'from-[#6e8b74] to-[#8aa890]',
    glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(110,139,116,0.45)]',
    Icon: IconInbox,
  },
];

const VERSION_META: Record<string, { label: string; hue: string }> = {
  menu: { label: 'Menu', hue: 'bg-[#1d3f5e]' },
  notices: { label: 'Notices', hue: 'bg-[#c68642]' },
  transport: { label: 'Transport', hue: 'bg-[#e2703a]' },
  calendar: { label: 'Calendar', hue: 'bg-[#6e8b74]' },
  portals: { label: 'Portals', hue: 'bg-[#1d3f5e]' },
  apps: { label: 'Apps', hue: 'bg-[#345a7a]' },
  map: { label: 'Map', hue: 'bg-[#c68642]' },
  services: { label: 'Services', hue: 'bg-[#6e8b74]' },
  emergency: { label: 'Emergency', hue: 'bg-[#b23a34]' },
  about: { label: 'About', hue: 'bg-[#1d3f5e]' },
  laundry: { label: 'Laundry', hue: 'bg-[#6e8b74]' },
  wifi: { label: 'Wi-Fi', hue: 'bg-[#345a7a]' },
  erickshaw: { label: 'E-Rickshaw', hue: 'bg-[#e2703a]' },
  mealWindows: { label: 'Meal windows', hue: 'bg-[#c68642]' },
};

const VERSION_ORDER = Object.keys(VERSION_META);

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const [meta, setMeta] = useState<MetaDoc | null>(null);
  const [suggestionCount, setSuggestionCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const moduleCount = useMemo(() => {
    if (!meta?.versions) return 0;
    return Object.keys(meta.versions).length;
  }, [meta]);

  useEffect(() => {
    void (async () => {
      try {
        const m = await fetchCampusModule<MetaDoc>('/sync/manifest');
        setMeta(m);
      } catch {
        setMeta(null);
      }
      try {
        const s = await apiFetch<{ suggestions: SuggestionDoc[] }>('/admin/suggestions');
        setSuggestionCount(s.suggestions?.length ?? 0);
      } catch {
        setSuggestionCount(null);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div className="relative flex flex-col gap-8">
      {/* Ambient background orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-sandstone/20 blur-3xl animate-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-40 h-80 w-80 rounded-full bg-indigo/10 blur-3xl animate-float-delayed"
      />

      {/* Hero */}
      <section
        className="dash-reveal relative overflow-hidden rounded-[1.35rem] border border-white/60 bg-gradient-to-br from-indigo-deep via-[#123652] to-[#1d3f5e] p-5 text-sand shadow-glow sm:rounded-[1.75rem] sm:p-8"
        style={{ animationDelay: '0ms' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(198,134,66,0.35), transparent 42%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.12), transparent 35%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-2 -right-2 h-32 w-32 rounded-full border border-sandstone/30"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sand/90 backdrop-blur">
              <IconSpark className="h-3.5 w-3.5 text-sandstone" />
              Campus console
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {greeting}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
              Publish content for IITJ One. Saves bump module versions so mobile syncs the latest
              campus data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-md">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                Modules
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white">
                {loaded ? <AnimatedCounter value={moduleCount} /> : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-md">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                Inbox
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-sandstone">
                {suggestionCount === null ? (
                  '—'
                ) : (
                  <AnimatedCounter value={suggestionCount} />
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div
          className="dash-reveal mb-4 flex items-end justify-between"
          style={{ animationDelay: '80ms' }}
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-muted/80">Jump into the modules you use most.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dash-reveal group block min-w-0 ${item.glow}`}
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <article className="relative flex h-full min-h-[150px] flex-col overflow-hidden rounded-[1.35rem] border border-border/80 bg-surface/90 p-5 shadow-card backdrop-blur-sm transition duration-300 ease-out group-hover:-translate-y-1.5 group-hover:border-indigo/20 group-hover:shadow-elevated">
                <div
                  aria-hidden
                  className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${item.accent} opacity-[0.12] transition duration-500 group-hover:scale-125 group-hover:opacity-25`}
                />
                <div
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-soft`}
                >
                  <item.Icon className="h-5 w-5" />
                </div>
                <h3 className="relative mt-4 text-base font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="relative mt-1.5 flex-1 text-sm leading-snug text-muted">{item.desc}</p>
                <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo transition group-hover:gap-2.5">
                  Open
                  <IconArrow className="h-3.5 w-3.5" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Sync + Inbox */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div
          className="dash-reveal relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-surface/90 p-6 shadow-card backdrop-blur-sm lg:col-span-3"
          style={{ animationDelay: '400ms' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-indigo">
                <IconSync className="h-4 w-4" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em]">Sync versions</h3>
              </div>
              <p className="mt-1 text-sm text-muted">Live module versions from the API manifest.</p>
            </div>
          </div>

          {meta?.versions ? (
            <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {VERSION_ORDER.filter((k) => k in meta.versions).map((key, i) => {
                const info = VERSION_META[key] ?? { label: key, hue: 'bg-indigo' };
                return (
                  <div
                    key={key}
                    className="dash-reveal group/tile relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-3.5 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-indigo/25 hover:shadow-soft"
                    style={{ animationDelay: `${450 + i * 35}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${info.hue}`} />
                      <dt className="truncate text-[11px] font-medium text-muted">{info.label}</dt>
                    </div>
                    <dd className="mt-2 font-mono text-2xl font-semibold leading-none tracking-tight text-indigo">
                      <AnimatedCounter value={Number(meta.versions[key] ?? 0)} duration={700} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="mt-6 text-sm text-muted">
              Could not load manifest — is the API running on port 6002?
            </p>
          )}
        </div>

        <div
          className="dash-reveal relative flex min-h-full flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-gradient-to-br from-sandstone-tint via-white to-sand p-6 shadow-card lg:col-span-2"
          style={{ animationDelay: '480ms' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-sandstone/20 blur-2xl"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-sandstone">
              <IconInbox className="h-4 w-4" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em]">Inbox</h3>
            </div>
            <p className="mt-1 text-sm text-muted">Anonymous suggestions from students.</p>

            <div className="mt-8 flex items-end gap-3">
              <p className="bg-gradient-to-br from-ink to-indigo bg-clip-text text-6xl font-semibold leading-none tracking-tight text-transparent">
                {suggestionCount === null ? (
                  '—'
                ) : (
                  <AnimatedCounter value={suggestionCount} />
                )}
              </p>
              <p className="pb-1.5 text-sm text-muted">received</p>
            </div>
          </div>

          <Link
            href="/suggestions"
            className="group relative mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-indigo px-4 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-indigo-deep hover:shadow-elevated"
          >
            View inbox
            <IconArrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
