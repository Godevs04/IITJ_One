/**
 * Inline SVG wordmark built from the documented concept in
 * docs/IITJ_One_Detailed_Plan.md: "a minimal '1' merged with a location
 * pin or connected dots." No official IITJ crest/seal is used anywhere —
 * this is an original mark, not an app-icon asset (none exists yet).
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect width="28" height="28" rx="8" className="fill-indigo" />
        <path
          d="M14 6.5v11.5"
          stroke="rgb(var(--color-sand))"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M11.2 8.6 14 6.5l1.4 1.05" stroke="rgb(var(--color-sand))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="21" r="1.6" className="fill-sandstone" />
      </svg>
      <span className="text-base font-semibold tracking-tight text-ink">IITJ One</span>
    </span>
  );
}
