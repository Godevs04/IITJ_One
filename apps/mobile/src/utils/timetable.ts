import type { TimetableEntry } from '@/services/localDb';
import { nowMinutes, parseTimeToMinutes, todayDayShort } from './date';

export interface NextClass {
  entry: TimetableEntry;
  secondsUntil: number;
}

export function getClassesForDay(
  entries: TimetableEntry[],
  dayShort: string,
): TimetableEntry[] {
  return entries
    .filter((e) => e.daysOfWeek.includes(dayShort))
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

export function getNextClass(entries: TimetableEntry[]): NextClass | null {
  const today = todayDayShort();
  const classes = getClassesForDay(entries, today);
  const now = nowMinutes();
  let best: NextClass | null = null;

  for (const entry of classes) {
    const start = parseTimeToMinutes(entry.startTime);
    const diff = start - now;
    if (diff < 0) continue;
    const secondsUntil = diff * 60;
    if (!best || secondsUntil < best.secondsUntil) {
      best = { entry, secondsUntil };
    }
  }

  return best;
}
