import { formatClock, localDateKey } from '../reminders/reminderLogic';

/**
 * Time-grid rules for the timetable (Screen 14): where a block sits, how tall it is, and how overlapping classes
 * share the width. Pure functions — no React, no storage.
 */
export const TIMELINE_START_HOUR = 6;
export const DEFAULT_END_HOUR = 20;
export const PIXELS_PER_HOUR = 72;
/** A short class keeps a readable block without moving its start. */
export const MIN_BLOCK_HEIGHT = 44;

export interface TimedItem {
  id: string;
  startMin: number;
  endMin: number;
}

export interface BlockLayout extends TimedItem {
  top: number;
  height: number;
  /** Which side-by-side column this block takes among classes that overlap it, and how many there are. */
  column: number;
  columns: number;
}

/** The hours the grid shows: 6 AM to 8 PM by default, widened if a class falls outside so nothing is clipped. */
export function timelineRange(items: readonly TimedItem[]): { startHour: number; endHour: number } {
  let startHour = TIMELINE_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const i of items) {
    startHour = Math.min(startHour, Math.floor(i.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(i.endMin / 60));
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

export function hourLabels(startHour: number, endHour: number): { hour: number; label: string; top: number }[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => ({
    hour: startHour + i,
    label: formatClock((startHour + i) * 60),
    top: i * PIXELS_PER_HOUR,
  }));
}

/** Vertical position and height from the start and end times alone. */
export function blockGeometry(startMin: number, endMin: number, startHour: number): { top: number; height: number } {
  const top = ((startMin - startHour * 60) / 60) * PIXELS_PER_HOUR;
  const height = Math.max(MIN_BLOCK_HEIGHT, ((endMin - startMin) / 60) * PIXELS_PER_HOUR);
  return { top, height };
}

/**
 * Positions every item, and splits the width between items that overlap in time — none is hidden or covered.
 * Items are grouped into clusters of mutually-connected overlaps; inside a cluster each takes the first free column.
 */
export function layoutBlocks(items: readonly TimedItem[], startHour: number): BlockLayout[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out: BlockLayout[] = [];
  let cluster: BlockLayout[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = cluster.reduce((n, b) => Math.max(n, b.column + 1), 1);
    for (const b of cluster) b.columns = columns;
    out.push(...cluster);
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();
    // The block's visual bottom can pass its end (minimum height), so collisions use the drawn extent.
    const drawnEnd = item.startMin + (Math.max(MIN_BLOCK_HEIGHT, ((item.endMin - item.startMin) / 60) * PIXELS_PER_HOUR) / PIXELS_PER_HOUR) * 60;
    let column = 0;
    while (cluster.some((b) => b.column === column && b.startMin + (b.height / PIXELS_PER_HOUR) * 60 > item.startMin)) column++;
    cluster.push({ ...item, ...blockGeometry(item.startMin, item.endMin, startHour), column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, drawnEnd);
  }
  if (cluster.length > 0) flush();
  return out;
}

const DAY_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const WEEKDAY_ABBR = ['SUN', 'MON', 'TUES', 'WED', 'THURS', 'FRI', 'SAT'];

export interface DateChip {
  key: string;
  date: Date;
  /** "MON", "TUES"… */
  weekday: string;
  /** "02" */
  day: string;
  /** 'mon' … 'sun', matching the timetable's stored weekdays. */
  dayShort: (typeof DAY_SHORT)[number];
}

/** The seven dates of the week (Monday first) that contains `anchor`. */
export function weekChips(anchor: Date): DateChip[] {
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return {
      key: localDateKey(date),
      date,
      weekday: WEEKDAY_ABBR[date.getDay()],
      day: String(date.getDate()).padStart(2, '0'),
      dayShort: DAY_SHORT[date.getDay()],
    };
  });
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Where a "now" line sits on the grid, or null when it is outside the shown hours. */
export function nowOffset(nowMin: number, startHour: number, endHour: number): number | null {
  if (nowMin < startHour * 60 || nowMin > endHour * 60) return null;
  return ((nowMin - startHour * 60) / 60) * PIXELS_PER_HOUR;
}
