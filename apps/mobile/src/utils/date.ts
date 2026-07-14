import {
  DEFAULT_MEAL_WINDOWS,
  type MealKey,
  type MealWindowsDoc,
} from '@iitj1/types';
import { readCachedModule } from '@/services/sync';

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

function toMealWindow(cfg: {
  start: string;
  end: string;
  label: string;
  timeLabel: string;
}): MealWindow {
  return {
    startMin: parseTimeToMinutes(cfg.start),
    endMin: parseTimeToMinutes(cfg.end),
    label: cfg.label,
    timeLabel: cfg.timeLabel,
  };
}

/** Hardcoded defaults — prefer getMealWindows() after sync. */
export const MEAL_WINDOWS: Record<MealKey, MealWindow> = {
  breakfast: toMealWindow(DEFAULT_MEAL_WINDOWS.breakfast),
  lunch: toMealWindow(DEFAULT_MEAL_WINDOWS.lunch),
  snacks: toMealWindow(DEFAULT_MEAL_WINDOWS.snacks),
  dinner: toMealWindow(DEFAULT_MEAL_WINDOWS.dinner),
};

export function getMealWindows(): Record<MealKey, MealWindow> {
  const doc = readCachedModule<MealWindowsDoc>('mealWindows');
  const windows = doc?.windows ?? DEFAULT_MEAL_WINDOWS;
  return {
    breakfast: toMealWindow(windows.breakfast),
    lunch: toMealWindow(windows.lunch),
    snacks: toMealWindow(windows.snacks),
    dinner: toMealWindow(windows.dinner),
  };
}

export function currentMealKey(): MealKey {
  const now = nowMinutes();
  const windows = getMealWindows();
  if (now < windows.breakfast.endMin) return 'breakfast';
  if (now < windows.lunch.endMin) return 'lunch';
  if (now < windows.snacks.endMin) return 'snacks';
  return 'dinner';
}

export interface MealTimeStatus {
  status: 'active' | 'upcoming' | 'passed';
  timeLeftString: string;
}

export function getMealTimeStatus(key: MealKey): MealTimeStatus {
  const now = nowMinutes();
  const window = getMealWindows()[key];

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
