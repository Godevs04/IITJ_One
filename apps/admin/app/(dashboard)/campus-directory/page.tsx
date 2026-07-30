'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listDepartments, listOrganizations, listPeople, listRoles } from '@/lib/campusDirectoryApi';
import { Card, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';

interface Counts {
  departments: number;
  people: number;
  organizations: number;
  roles: number;
}

const CARDS: { key: keyof Counts; label: string; href: string; description: string }[] = [
  { key: 'departments', label: 'Departments', href: '/campus-directory/departments', description: 'Academic departments' },
  { key: 'people', label: 'People', href: '/campus-directory/people', description: 'Faculty, staff & administration' },
  { key: 'organizations', label: 'Organizations', href: '/campus-directory/organizations', description: 'Clubs, committees, offices & more' },
  { key: 'roles', label: 'Roles', href: '/campus-directory/roles', description: 'Titles & positions held by people' },
];

export default function CampusDirectoryDashboardPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({ departments: 0, people: 0, organizations: 0, roles: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [departments, people, organizations, roles] = await Promise.all([
          listDepartments({ limit: 1 }),
          listPeople({ limit: 1 }),
          listOrganizations({ limit: 1 }),
          listRoles({ limit: 1 }),
        ]);
        if (cancelled) return;
        setCounts({
          departments: departments.total,
          people: people.total,
          organizations: organizations.total,
          roles: roles.total,
        });
      } catch (err) {
        if (!cancelled) push('error', 'Could not load Campus Directory summary', err instanceof Error ? err.message : 'Unknown error');
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
        title="Campus Directory"
        subtitle="Leadership, departments, faculty, administration, clubs & societies, student council, and offices & cells — all in one place."
      />

      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => (
            <Link key={card.key} href={card.href}>
              <Card className="space-y-2 transition hover:shadow-soft">
                <p className="text-3xl font-semibold text-ink">{counts[card.key]}</p>
                <p className="text-sm font-medium text-ink">{card.label}</p>
                <p className="text-xs text-muted">{card.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="space-y-2">
        <h2 className="text-base font-semibold text-ink">About this module</h2>
        <p className="text-sm text-muted">
          Phase 1 of the Campus Directory establishes the full architecture — database, sync, and
          admin CRUD — without yet shipping detailed mobile browsing screens. Content added here
          syncs to the mobile app&apos;s offline cache immediately; the mobile Campus Directory
          section currently shows &quot;Coming Soon&quot; placeholders for each category while the
          browsing UI is built in a later phase.
        </p>
      </Card>
    </div>
  );
}
