import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function IconMenu(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
    </svg>
  );
}

export function IconNotices(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M6 8h12M6 12h8M6 16h10" strokeLinecap="round" />
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  );
}

export function IconTransport(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <rect x="3" y="6" width="18" height="11" rx="2" />
      <path d="M7 17v2M17 17v2M3 11h18" strokeLinecap="round" />
      <circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M4 6h16v12H4z" />
      <path d="M4 10l8 5 8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSync(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M4 12a8 8 0 0 1 13.5-5.7" strokeLinecap="round" />
      <path d="M20 12a8 8 0 0 1-13.5 5.7" strokeLinecap="round" />
      <path d="M16 4h2.5V6.5M8 20H5.5V17.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path
        d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
