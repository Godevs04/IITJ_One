export const colors = {
  indigo: '#1A78A3',
  indigoDeep: '#11303F',
  indigoTint: '#E2F2FA',
  sandstone: '#6B6A00',
  sandstoneTint: '#FBFFD6',
  dusk: '#C2410C',
  sand: '#F5F7FB',
  ink: '#01050D',
  muted: '#566173',
  border: '#E1E6EF',
  sage: '#6E8B74',
  nonVeg: '#B23A34',
  white: '#FFFFFF',
} as const;

export const campusId =
  process.env.NEXT_PUBLIC_CAMPUS_ID?.trim() || 'iitj';

/** Prefer same-origin Next rewrite so browser can always reach the API. */
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '/backend/api/v1';
