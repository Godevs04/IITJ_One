/**
 * Reminder model and the pure rules around it (grouping, labels, validation).
 * No storage or React here, so the same rules serve Home, the Reminder List and New Reminder.
 */

export interface Reminder {
  id: string;
  /** What the reminder is about; its first line is the title shown in lists. */
  memo: string;
  /** ISO instant the reminder starts. */
  scheduledAt: string;
  /** ISO instant it ends; null when the user gave no end time. */
  endsAt: string | null;
  /** IANA zone the reminder was created in, kept for a later move to server storage. */
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDraft {
  memo: string;
  /** Local calendar day, at any time of day. */
  date: Date | null;
  /** Minutes after midnight, local time. */
  startMinutes: number | null;
  endMinutes: number | null;
}

export const MEMO_MAX_LENGTH = 500;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD (toISOString() is UTC and lags a day before 05:30 IST). */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "04:00 PM" */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${pad(h % 12 || 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "04:00 PM – 06:00 PM", or just the start when there is no end time. */
export function formatTimeRange(reminder: Pick<Reminder, 'scheduledAt' | 'endsAt'>): string {
  const start = formatClock(minutesOfDay(new Date(reminder.scheduledAt)));
  return reminder.endsAt ? `${start} – ${formatClock(minutesOfDay(new Date(reminder.endsAt)))}` : start;
}

/** "November 04, 2026" */
export function formatLongDate(d: Date): string {
  return `${MONTHS_LONG[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
}

/** Home's date block: { date: "Nov 12", weekday: "Thursday" }. */
export function formatHomeDate(d: Date): { date: string; weekday: string } {
  return { date: `${MONTHS_SHORT[d.getMonth()]} ${pad(d.getDate())}`, weekday: WEEKDAYS_LONG[d.getDay()] };
}

/** Pill on a list row: "Today", "Nov 4", or "Jan 4, 2027" when the year differs from now. */
export function dateBadge(reminder: Pick<Reminder, 'scheduledAt'>, now: Date): string {
  const at = new Date(reminder.scheduledAt);
  if (localDateKey(at) === localDateKey(now)) return 'Today';
  const short = `${MONTHS_SHORT[at.getMonth()]} ${at.getDate()}`;
  return at.getFullYear() === now.getFullYear() ? short : `${short}, ${at.getFullYear()}`;
}

/** First line of the memo — the title shown in lists (rows truncate it visually). */
export function reminderTitle(reminder: Pick<Reminder, 'memo'>): string {
  return reminder.memo.split('\n')[0].trim();
}

const byStart = (a: Reminder, b: Reminder) => a.scheduledAt.localeCompare(b.scheduledAt);

/**
 * Today's reminders (including ones whose time has already passed today) and everything after today,
 * each in chronological order. Earlier days are dropped.
 */
export function splitReminders(reminders: readonly Reminder[], now: Date): { today: Reminder[]; upcoming: Reminder[] } {
  const todayKey = localDateKey(now);
  const today: Reminder[] = [];
  const upcoming: Reminder[] = [];
  for (const r of reminders) {
    const key = localDateKey(new Date(r.scheduledAt));
    if (key === todayKey) today.push(r);
    else if (key > todayKey) upcoming.push(r);
  }
  return { today: today.sort(byStart), upcoming: upcoming.sort(byStart) };
}

/** Home's highlighted label for today: "No reminders today", the single title, or "3 reminders today". */
export function todaySummary(today: readonly Reminder[]): string {
  if (today.length === 0) return 'No reminders today';
  if (today.length === 1) return reminderTitle(today[0]);
  return `${today.length} reminders today`;
}

export type DraftErrors = Partial<Record<'memo' | 'date' | 'start' | 'end', string>>;

/** Field errors for a draft; an empty object means it can be saved. */
export function validateDraft(draft: ReminderDraft, now: Date): DraftErrors {
  const errors: DraftErrors = {};
  const memo = draft.memo.trim();
  if (!memo) errors.memo = 'Write what this reminder is about.';
  else if (memo.length > MEMO_MAX_LENGTH) errors.memo = `Keep the memo under ${MEMO_MAX_LENGTH} characters.`;
  if (!draft.date) errors.date = 'Choose a date.';
  if (draft.startMinutes == null) errors.start = 'Choose a time.';
  if (draft.date && draft.startMinutes != null) {
    if (atMinutes(draft.date, draft.startMinutes).getTime() <= now.getTime()) {
      errors.start = 'That time has already passed.';
    }
    if (draft.endMinutes != null && draft.endMinutes <= draft.startMinutes) {
      errors.end = 'The end time must be after the start time.';
    }
  }
  return errors;
}

function atMinutes(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

/** Builds the stored reminder from a draft that has passed validateDraft. */
export function buildReminder(draft: ReminderDraft, now: Date, id: string): Reminder {
  if (!draft.date || draft.startMinutes == null) throw new Error('Reminder draft is missing its date or time');
  const stamp = now.toISOString();
  return {
    id,
    memo: draft.memo.trim(),
    scheduledAt: atMinutes(draft.date, draft.startMinutes).toISOString(),
    endsAt: draft.endMinutes == null ? null : atMinutes(draft.date, draft.endMinutes).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Kolkata',
    createdAt: stamp,
    updatedAt: stamp,
  };
}
