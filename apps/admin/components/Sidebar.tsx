'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredAdmin } from '@/lib/auth';
import { logout } from '@/lib/api';
import { useEffect, useState } from 'react';

interface NavLeaf {
  href: string;
  label: string;
  superadminOnly?: boolean;
}

interface NavBranch {
  label: string;
  children: NavLeaf[];
}

type NavItem = NavLeaf | NavBranch;

function isBranch(item: NavItem): item is NavBranch {
  return 'children' in item;
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/analytics', label: 'Analytics' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/menu', label: 'Mess Menu' },
      { href: '/notices', label: 'Notices' },
    ],
  },
  {
    label: 'Campus data',
    items: [
      {
        label: 'Transport',
        children: [
          { href: '/transport', label: 'Weekday Schedule' },
          { href: '/transport/schedule-exceptions', label: 'Temporary Schedules' },
          { href: '/transport/alerts', label: 'Transport Alerts' },
          { href: '/transport/live-tracking', label: 'Live Tracking' },
        ],
      },
      { href: '/calendar', label: 'Calendar' },
      { href: '/holidays', label: 'Institute Holidays' },
      { href: '/portals', label: 'Portals' },
      { href: '/apps', label: 'Apps' },
      { href: '/map', label: 'Map' },
      { href: '/services', label: 'Services' },
      { href: '/emergency', label: 'Emergency' },
      { href: '/laundry', label: 'Laundry' },
      { href: '/wifi', label: 'Wi-Fi' },
      { href: '/erickshaw', label: 'E-Rickshaw' },
      { href: '/meal-windows', label: 'Meal windows' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/push', label: 'Push' },
      { href: '/suggestions', label: 'Suggestions' },
      { href: '/audit', label: 'Audit log' },
      { href: '/admins', label: 'Admins', superadminOnly: true },
    ],
  },
];

function navActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  onNavigate,
  indent = false,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center rounded-xl py-2 text-sm transition duration-200 ${indent ? 'pl-6 pr-3' : 'px-3'} ${
        active
          ? 'bg-white/12 font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
          : 'text-white/65 hover:bg-white/6 hover:text-white'
      }`}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sandstone"
        />
      ) : null}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavBranchItem({
  branch,
  pathname,
  onNavigate,
}: {
  branch: NavBranch;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActiveChild = branch.children.some((c) => navActive(pathname, c.href));
  const [expanded, setExpanded] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setExpanded(true);
  }, [hasActiveChild]);

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition duration-200 ${
          hasActiveChild ? 'font-medium text-white' : 'text-white/65 hover:bg-white/6 hover:text-white'
        }`}
        aria-expanded={expanded}
      >
        <span className="truncate">{branch.label}</span>
        <span
          aria-hidden
          className={`text-[10px] text-white/40 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
      </button>
      {expanded ? (
        <ul className="mt-0.5 space-y-0.5">
          {branch.children.map((child) => (
            <li key={child.href}>
              <NavLink item={child} active={navActive(pathname, child.href)} onNavigate={onNavigate} indent />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function Sidebar({
  onNavigate,
  className = '',
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Admin');
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const admin = getStoredAdmin();
    if (admin?.name) setAdminName(admin.name);
    setIsSuperadmin(admin?.role === 'superadmin');
  }, []);

  return (
    <aside
      className={`relative flex h-full min-h-dvh w-[15.5rem] shrink-0 flex-col overflow-hidden border-r border-white/[0.08] bg-gradient-to-b from-indigo-deep via-[#00243f] to-[#001a2e] text-sand ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-24 h-40 w-40 rounded-full bg-sandstone/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-32 h-48 w-48 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative border-b border-white/10 px-5 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sandstone">
          IITJ one
        </p>
        <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Admin</h1>
        <div className="mt-3 h-px w-12 bg-gradient-to-r from-sandstone to-transparent" />
      </div>

      <nav className="scroll-thin relative flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items
                .filter((item) => isBranch(item) || !item.superadminOnly || isSuperadmin)
                .map((item) =>
                  isBranch(item) ? (
                    <NavBranchItem key={item.label} branch={item} pathname={pathname} onNavigate={onNavigate} />
                  ) : (
                    <li key={item.href}>
                      <NavLink item={item} active={navActive(pathname, item.href)} onNavigate={onNavigate} />
                    </li>
                  ),
                )}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-white/10 bg-black/10 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sandstone to-[#a56b32] text-xs font-semibold text-white shadow-soft">
            {adminName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{adminName}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-0.5 text-xs text-white/50 transition hover:text-sandstone"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
