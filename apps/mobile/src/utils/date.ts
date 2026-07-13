const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const DAY_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function todayDayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

export function todayDayShort(): string {
  return DAY_SHORT[new Date().getDay()];
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function expirySeconds(expiryDate: string): number {
  return Math.max(0, Math.floor((new Date(expiryDate).getTime() - Date.now()) / 1000));
}

export function formatExpiryLabel(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Expired';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours >= 24) return `Expires in ${Math.floor(hours / 24)}d`;
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

export function currentMealKey(): 'breakfast' | 'lunch' | 'snacks' | 'dinner' {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snacks';
  return 'dinner';
}
