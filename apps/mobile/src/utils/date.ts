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
  const clean = time.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  const parts = clean.replace(/[AP]M/, '').trim().split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;

  if (isPM && h < 12) {
    h += 12;
  } else if (isAM && h === 12) {
    h = 0;
  }

  return h * 60 + m;
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

export interface MealWindow {
  startMin: number;
  endMin: number;
  label: string;
  timeLabel: string;
}

export const MEAL_WINDOWS: Record<'breakfast' | 'lunch' | 'snacks' | 'dinner', MealWindow> = {
  breakfast: { startMin: 7 * 60, endMin: 10 * 60, label: 'Breakfast', timeLabel: '7:00 AM - 10:00 AM' },
  lunch: { startMin: 12 * 60, endMin: 14 * 60, label: 'Lunch', timeLabel: '12:00 PM - 2:00 PM' },
  snacks: { startMin: 16 * 60 + 30, endMin: 18 * 60, label: 'Snacks', timeLabel: '4:30 PM - 6:00 PM' },
  dinner: { startMin: 19 * 60 + 30, endMin: 22 * 60, label: 'Dinner', timeLabel: '7:30 PM - 10:00 PM' },
};

export function currentMealKey(): 'breakfast' | 'lunch' | 'snacks' | 'dinner' {
  const now = nowMinutes();
  if (now < MEAL_WINDOWS.breakfast.endMin) return 'breakfast';
  if (now < MEAL_WINDOWS.lunch.endMin) return 'lunch';
  if (now < MEAL_WINDOWS.snacks.endMin) return 'snacks';
  return 'dinner';
}

export interface MealTimeStatus {
  status: 'active' | 'upcoming' | 'passed';
  timeLeftString: string;
}

export function getMealTimeStatus(
  key: 'breakfast' | 'lunch' | 'snacks' | 'dinner'
): MealTimeStatus {
  const now = nowMinutes();
  const window = MEAL_WINDOWS[key];

  if (now >= window.startMin && now < window.endMin) {
    const diff = window.endMin - now;
    return {
      status: 'active',
      timeLeftString: `Ends in ${formatMinutes(diff)}`,
    };
  } else if (now < window.startMin) {
    const diff = window.startMin - now;
    return {
      status: 'upcoming',
      timeLeftString: `Starts in ${formatMinutes(diff)}`,
    };
  } else {
    return {
      status: 'passed',
      timeLeftString: 'Closed',
    };
  }
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

