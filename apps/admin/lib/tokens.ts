export const colors = {
  indigo: '#1D3F5E',
  indigoDeep: '#002947',
  indigoTint: '#E8EDF2',
  sandstone: '#C68642',
  sandstoneTint: '#F7EDE0',
  dusk: '#E2703A',
  sand: '#F6F0E4',
  ink: '#22292F',
  muted: '#5C6570',
  border: '#DCD4C4',
  sage: '#6E8B74',
  nonVeg: '#B23A34',
  white: '#FFFFFF',
} as const;

export const campusId =
  process.env.NEXT_PUBLIC_CAMPUS_ID?.trim() || 'iitj';

/** Prefer same-origin Next rewrite so browser can always reach the API. */
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '/backend/api/v1';
