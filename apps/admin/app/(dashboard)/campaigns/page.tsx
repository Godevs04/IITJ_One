'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listCampaigns } from '@/lib/campaignsApi';
import { Card, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';

interface Counts {
  total: number;
  draft: number;
  published: number;
  expired: number;
  archived: number;
  featured: number;
}

const CARDS: { key: keyof Omit<Counts, 'total' | 'featured'>; label: string; description: string }[] = [
  { key: 'draft', label: 'Draft', description: 'Not yet published' },
  { key: 'published', label: 'Published', description: 'Live and within their date window' },
  { key: 'expired', label: 'Expired', description: 'Published but past their end date' },
  { key: 'archived', label: 'Archived', description: 'Retired campaigns' },
];

export default function CampaignsDashboardPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({ total: 0, draft: 0, published: 0, expired: 0, archived: 0, featured: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [all, draft, published, expired, archived, featured] = await Promise.all([
          listCampaigns({ limit: 1 }),
          listCampaigns({ limit: 1, effectiveStatus: 'draft' }),
          listCampaigns({ limit: 1, effectiveStatus: 'published' }),
          listCampaigns({ limit: 1, effectiveStatus: 'expired' }),
          listCampaigns({ limit: 1, effectiveStatus: 'archived' }),
          listCampaigns({ limit: 1, featured: true }),
        ]);
        if (cancelled) return;
        setCounts({
          total: all.total,
          draft: draft.total,
          published: published.total,
          expired: expired.total,
          archived: archived.total,
          featured: featured.total,
        });
      } catch (err) {
        if (!cancelled) push('error', 'Could not load Discover summary', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover"
        subtitle="Campaign platform — banners, announcements, events, and promotions surfaced across the app."
      />

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((card) => (
              <Link key={card.key} href={`/campaigns/list?tab=${card.key}`}>
                <Card className="space-y-2 transition hover:shadow-soft">
                  <p className="text-3xl font-semibold text-ink">{counts[card.key]}</p>
                  <p className="text-sm font-medium text-ink">{card.label}</p>
                  <p className="text-xs text-muted">{card.description}</p>
                </Card>
              </Link>
            ))}
          </div>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Total campaigns</p>
              <p className="text-xs text-muted">Across every status, excluding deleted</p>
            </div>
            <p className="text-2xl font-semibold text-ink">{counts.total}</p>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Featured</p>
              <p className="text-xs text-muted">Highlighted regardless of status</p>
            </div>
            <p className="text-2xl font-semibold text-ink">{counts.featured}</p>
          </Card>
        </>
      )}

      <Card className="space-y-2">
        <h2 className="text-base font-semibold text-ink">Manage campaigns</h2>
        <p className="text-sm text-muted">
          Create, edit, duplicate, preview, and enable or disable campaigns from the{' '}
          <Link href="/campaigns/list" className="font-medium text-indigo hover:underline">
            Campaign List
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
