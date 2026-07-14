/**
 * Bundled emergency contacts for offline / empty-cache safety.
 * Synced API module replaces these when available.
 */
export const BUNDLED_EMERGENCY_CONTACTS = [
  { label: 'Campus Security', phone: '100', order: 1 },
  { label: 'Ambulance', phone: '108', order: 2 },
  { label: 'Fire', phone: '101', order: 3 },
  { label: 'Health Centre', phone: '+91-291-2800000', order: 4 },
] as const;
