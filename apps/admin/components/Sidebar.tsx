'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredAdmin } from '@/lib/auth';
import { logout } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard' }],
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
      { href: '/transport', label: 'Transport' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/portals', label: 'Portals' },
      { href: '/apps', label: 'Apps' },
      { href: '/map', label: 'Map' },
      { href: '/services', label: 'Services' },
      { href: '/emergency', label: 'Emergency' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/push', label: 'Push' },
      { href: '/suggestions', label: 'Suggestions' },
      { href: '/audit', label: 'Audit log' },
    ],
  },
] as const;

function navActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const admin = getStoredAdmin();
    if (admin?.name) setAdminName(admin.name);
  }, []);

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-indigo-deep text-sand">
      <div className="border-b border-white/10 px-4 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sandstone">
          IITJ one
        </p>
        <h1 className="mt-1 text-base font-semibold tracking-tight">Admin</h1>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-4">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = navActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2.5 py-1.5 text-sm transition ${
                        active
                          ? 'bg-white/12 font-medium text-white'
                          : 'text-white/70 hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-medium text-white">{adminName}</p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-1.5 text-xs text-white/55 transition hover:text-sandstone"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
