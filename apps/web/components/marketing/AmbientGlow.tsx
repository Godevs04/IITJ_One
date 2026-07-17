/**
 * Ambient blurred color-orb background, extracted from the inline gradient
 * div pattern in apps/admin/app/login/page.tsx + apps/admin/app/(dashboard)/page.tsx
 * (this is the first shared component for it — previously duplicated inline).
 */
export function AmbientGlow({ variant = 'default' }: { variant?: 'default' | 'hero' }) {
  if (variant === 'hero') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-sandstone/20 blur-3xl animate-float" />
        <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-indigo/10 blur-3xl animate-float-delayed" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-sandstone/15 blur-3xl animate-float" />
    </div>
  );
}
