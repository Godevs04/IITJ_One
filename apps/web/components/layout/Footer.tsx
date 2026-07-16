import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { DISCLAIMER, FOOTER_LINKS, TAGLINE } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-sand/60">
      <div className="mx-auto max-w-8xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">{TAGLINE}</p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">{group.heading}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink/80 hover:text-indigo">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border/70 pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
          <p className="mt-2 text-xs text-muted">© {new Date().getFullYear()} IITJ One. Built by students, for students.</p>
        </div>
      </div>
    </footer>
  );
}
