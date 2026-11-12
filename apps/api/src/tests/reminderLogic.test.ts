/**
 * Reminder rules for the IITJ One redesign (apps/mobile/src/reminders/reminderLogic.ts) — pure, tested here
 * because the mobile app has no unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import {
  buildReminder,
  dateBadge,
  formatClock,
  formatTimeRange,
  splitReminders,
  todaySummary,
  validateDraft,
  type Reminder,
  type ReminderDraft,
} from '../../../mobile/src/reminders/reminderLogic';

// Local-time constructors throughout, so the tests hold in any timezone.
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const NOW = at(2026, 11, 12, 10, 0);

function reminder(id: string, start: Date, end: Date | null = null, memo = id): Reminder {
  return {
    id,
    memo,
    scheduledAt: start.toISOString(),
    endsAt: end ? end.toISOString() : null,
    timezone: 'Asia/Kolkata',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

test('splitReminders: today (including already-passed) and upcoming, each chronological; earlier days dropped', () => {
  const list = [
    reminder('workshop', at(2026, 11, 12, 16), at(2026, 11, 12, 18)),
    reminder('nov10', at(2026, 11, 10, 9)),
    reminder('music', at(2026, 11, 20, 14)),
    reminder('passed-today', at(2026, 11, 12, 8)),
    reminder('tomorrow', at(2026, 11, 13, 17)),
    reminder('seminar', at(2026, 11, 12, 15), at(2026, 11, 12, 16)),
  ];
  const { today, upcoming } = splitReminders(list, NOW);
  assert.deepStrictEqual(today.map((r) => r.id), ['passed-today', 'seminar', 'workshop']);
  assert.deepStrictEqual(upcoming.map((r) => r.id), ['tomorrow', 'music']);
});

test('splitReminders: a reminder moves from Upcoming to Today when its day arrives', () => {
  const list = [reminder('tomorrow', at(2026, 11, 13, 17))];
  assert.strictEqual(splitReminders(list, NOW).upcoming.length, 1);
  const nextDay = splitReminders(list, at(2026, 11, 13, 0, 1));
  assert.deepStrictEqual([nextDay.today.length, nextDay.upcoming.length], [1, 0]);
});

test('dateBadge: Today, short date, and the year only when it differs', () => {
  assert.strictEqual(dateBadge(reminder('a', at(2026, 11, 12, 23, 59)), NOW), 'Today');
  assert.strictEqual(dateBadge(reminder('b', at(2026, 11, 4, 17)), NOW), 'Nov 4');
  assert.strictEqual(dateBadge(reminder('c', at(2027, 1, 4, 17)), NOW), 'Jan 4, 2027');
});

test('formatting: 12-hour clock and ranges; no end time is never invented', () => {
  assert.strictEqual(formatClock(0), '12:00 AM');
  assert.strictEqual(formatClock(12 * 60 + 30), '12:30 PM');
  assert.strictEqual(formatClock(17 * 60), '05:00 PM');
  assert.strictEqual(formatTimeRange(reminder('r', at(2026, 11, 12, 16), at(2026, 11, 12, 18))), '04:00 PM – 06:00 PM');
  assert.strictEqual(formatTimeRange(reminder('r', at(2026, 11, 12, 17))), '05:00 PM');
});

test('todaySummary: empty state, single title (first memo line), or a count', () => {
  assert.strictEqual(todaySummary([]), 'No reminders today');
  assert.strictEqual(todaySummary([reminder('a', NOW, null, 'Submit report\nwith annexures')]), 'Submit report');
  assert.strictEqual(todaySummary([reminder('a', NOW), reminder('b', NOW)]), '2 reminders today');
});

test('validateDraft: memo, date and start time are required; whitespace is not a memo', () => {
  const empty: ReminderDraft = { memo: '   ', date: null, startMinutes: null, endMinutes: null };
  assert.deepStrictEqual(Object.keys(validateDraft(empty, NOW)).sort(), ['date', 'memo', 'start']);
});

test('validateDraft: rejects a time that has passed and an end time that is not after the start', () => {
  const today = at(2026, 11, 12);
  const past = validateDraft({ memo: 'x', date: today, startMinutes: 9 * 60, endMinutes: null }, NOW);
  assert.match(past.start ?? '', /already passed/);
  const badEnd = validateDraft({ memo: 'x', date: today, startMinutes: 17 * 60, endMinutes: 17 * 60 }, NOW);
  assert.match(badEnd.end ?? '', /after the start/);
  const ok = validateDraft({ memo: 'x', date: today, startMinutes: 17 * 60, endMinutes: 18 * 60 }, NOW);
  assert.deepStrictEqual(ok, {});
  assert.deepStrictEqual(validateDraft({ memo: 'x', date: at(2026, 11, 13), startMinutes: 60, endMinutes: null }, NOW), {});
});

test('buildReminder: trims the memo, keeps the chosen local time, and leaves endsAt null without an end time', () => {
  const draft: ReminderDraft = { memo: '  Submit Project Report ', date: at(2026, 11, 13, 22, 30), startMinutes: 17 * 60, endMinutes: null };
  const r = buildReminder(draft, NOW, 'id-1');
  assert.strictEqual(r.memo, 'Submit Project Report');
  assert.strictEqual(r.endsAt, null);
  const start = new Date(r.scheduledAt);
  assert.deepStrictEqual([start.getDate(), start.getHours(), start.getMinutes()], [13, 17, 0]);
  const withEnd = buildReminder({ ...draft, endMinutes: 18 * 60 + 30 }, NOW, 'id-2');
  assert.strictEqual(formatTimeRange(withEnd), '05:00 PM – 06:30 PM');
});
