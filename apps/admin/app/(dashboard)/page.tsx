'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, fetchCampusModule } from '@/lib/api';
import { Card, PageHeader, StatusPill } from '@/components/ui';
import type { MetaDoc, SuggestionDoc } from '@/lib/types';

const QUICK = [
  {
    href: '/menu',
    title: 'Mess Menu',
    desc: 'Edit day × meal, import CSV, publish.',
  },
  {
    href: '/notices',
    title: 'Notices',
    desc: 'Create campus announcements.',
  },
  {
    href: '/transport',
    title: 'Transport',
    desc: 'Update shuttle routes & times.',
  },
  {
    href: '/suggestions',
    title: 'Suggestions',
    desc: 'Read anonymous student inbox.',
  },
] as const;

const VERSION_ORDER = [
  'menu',
  'notices',
  'transport',
  'calendar',
  'portals',
  'apps',
  'map',
  'services',
  'emergency',
  'about',
] as const;

export default function DashboardPage() {
  const [meta, setMeta] = useState<MetaDoc | null>(null);
  const [suggestionCount, setSuggestionCount] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const m = await fetchCampusModule<MetaDoc>('/sync/manifest');
        setMeta(m);
      } catch {
        setMeta(null);
      }
      try {
        const s = await apiFetch<{ suggestions: SuggestionDoc[] }>(
          '/admin/suggestions',
        );
        setSuggestionCount(s.suggestions?.length ?? 0);
      } catch {
        setSuggestionCount(null);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Campus ops"
        subtitle="Publish content for the IITJ one mobile app. Saves bump module versions for sync."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.map((item) => (
          <Link key={item.href} href={item.href} className="group block min-w-0">
            <Card className="flex h-full min-h-[132px] flex-col p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-elevated">
              <StatusPill label="Open" tone="info" />
              <h2 className="mt-3 text-base font-semibold text-ink">
                {item.title}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-snug text-muted">
                {item.desc}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Sync versions
          </h3>
          {meta?.versions ? (
            <dl className="mt-4 grid grid-cols-2 gap-2.5">
              {VERSION_ORDER.filter((k) => k in meta.versions).map((key) => (
                <div
                  key={key}
                  className="flex min-h-[64px] flex-col justify-center rounded-xl bg-sand px-3 py-2.5"
                >
                  <dt className="text-[11px] font-medium capitalize leading-none text-muted">
                    {key}
                  </dt>
                  <dd className="mt-1.5 font-mono text-xl font-semibold leading-none text-indigo">
                    {meta.versions[key] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Could not load manifest — is the API running on port 6002?
            </p>
          )}
        </Card>

        <Card className="flex min-h-full min-w-0 flex-col justify-between p-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Inbox
            </h3>
            <div className="mt-6 flex items-end gap-3">
              <p className="text-5xl font-semibold leading-none tracking-tight text-ink">
                {suggestionCount === null ? '—' : suggestionCount}
              </p>
              <p className="pb-1 text-sm text-muted">Suggestions received</p>
            </div>
          </div>
          <Link
            href="/suggestions"
            className="mt-8 inline-flex w-fit text-sm font-medium text-indigo transition hover:underline"
          >
            View inbox →
          </Link>
        </Card>
      </div>
    </div>
  );
}
