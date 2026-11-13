/**
 * PHC screen rules (apps/mobile/src/phc/phcLogic.ts) — pure, tested here because the mobile app has no
 * unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import type { DoctorScheduleDay } from '@iitj1/types';
import {
  currentShift,
  dialableNumber,
  formatTiming,
  istNow,
  nightWindow,
  orderContacts,
  parseTimingRange,
  rosterDateFor,
  rosterFor,
  visitsFor,
} from '../../../mobile/src/phc/phcLogic';

const schedule: DoctorScheduleDay[] = [
  {
    date: '2026-11-11',
    day: 'Wednesday',
    regularDoctors: [
      { doctorName: 'Dr. Sharwan', room: 'OPD-1', timing: '08:00-14:00', shift: 'Morning' },
      { doctorName: 'Dr. Hemant Joshi', room: 'OPD-1', timing: '14:00-20:00', shift: 'Evening' },
      { doctorName: 'Dr. Deepesh', room: 'OPD-1', timing: '20:00 - 08:00', shift: 'Night' },
    ],
    visitingSpecialists: [],
  },
];

test('timing text: 24-hour and AM/PM ranges both become 12-hour', () => {
  assert.deepStrictEqual(parseTimingRange('08:00-14:00'), { start: 480, end: 840 });
  assert.deepStrictEqual(parseTimingRange('03:00 PM- 06:30 PM'), { start: 900, end: 1110 });
  assert.strictEqual(formatTiming('20:00 - 08:00'), '08:00 PM – 08:00 AM');
  assert.strictEqual(formatTiming('08:00-14:00'), '08:00 AM – 02:00 PM');
  assert.strictEqual(formatTiming('By appointment'), 'By appointment', 'unreadable text is shown as published');
});

test('the night window comes from the roster, and the shift follows the clock', () => {
  const night = nightWindow(schedule);
  assert.deepStrictEqual(night, { start: 1200, end: 480 });
  assert.strictEqual(currentShift(10 * 60, night), 'day');
  assert.strictEqual(currentShift(19 * 60 + 59, night), 'day');
  assert.strictEqual(currentShift(20 * 60, night), 'night');
  assert.strictEqual(currentShift(3 * 60, night), 'night');
  assert.strictEqual(currentShift(8 * 60, night), 'day');
  assert.deepStrictEqual(nightWindow([]), { start: 1200, end: 480 }, 'documented fallback when no night entry exists');
});

test('istNow uses campus time whatever the device timezone', () => {
  // 2026-11-11 22:00 UTC is 03:30 on 12 Nov in Kolkata.
  assert.deepStrictEqual(istNow(new Date('2026-11-11T22:00:00Z')), { dateKey: '2026-11-12', minutes: 210 });
});

test('an overnight shift belongs to the date it started on', () => {
  const night = nightWindow(schedule);
  // 03:30 IST on 12 Nov is still the night shift that began on 11 Nov.
  assert.strictEqual(rosterDateFor(new Date('2026-11-11T22:00:00Z'), 'night', night), '2026-11-11');
  // 21:00 IST on 12 Nov is the night that begins on 12 Nov.
  assert.strictEqual(rosterDateFor(new Date('2026-11-12T15:30:00Z'), 'night', night), '2026-11-12');
  assert.strictEqual(rosterDateFor(new Date('2026-11-11T22:00:00Z'), 'day', night), '2026-11-12');
});

test('rosterFor splits Morning + Evening (Day) from Night', () => {
  assert.deepStrictEqual(rosterFor(schedule, '2026-11-11', 'day').map((d) => d.doctorName), ['Dr. Sharwan', 'Dr. Hemant Joshi']);
  assert.deepStrictEqual(rosterFor(schedule, '2026-11-11', 'night').map((d) => d.doctorName), ['Dr. Deepesh']);
  assert.deepStrictEqual(rosterFor(schedule, '2026-11-30', 'day'), []);
});

test('special visits show under the shift they start in', () => {
  const night = nightWindow(schedule);
  const visits = [
    { specialty: 'Gynaecology', timing: '03:00 PM - 06:30 PM' },
    { specialty: 'Psychiatry', timing: '10:00 PM - 11:00 PM' },
    { specialty: 'ENT' },
  ];
  assert.deepStrictEqual(visitsFor(visits, 'day', night).map((v) => v.specialty), ['Gynaecology', 'ENT']);
  assert.deepStrictEqual(visitsFor(visits, 'night', night).map((v) => v.specialty), ['Psychiatry']);
});

test('contacts: Reception, Pharmacy, Office first; numbers validated before dialling', () => {
  const ordered = orderContacts([
    { label: 'Laboratory', phone: '0291-2801186' },
    { label: 'Health Center Office', phone: '0291-2801184' },
    { label: 'Pharmacy', phone: '0291-2801183' },
    { label: 'PHC Reception', phone: '0291-2801190' },
  ]);
  assert.deepStrictEqual(ordered.map((c) => c.label), ['PHC Reception', 'Pharmacy', 'Health Center Office', 'Laboratory']);
  assert.strictEqual(dialableNumber('0291-2801190'), '02912801190');
  assert.strictEqual(dialableNumber('+91 291 280 1190'), '+912912801190');
  assert.strictEqual(dialableNumber('ext 12'), null);
  assert.strictEqual(dialableNumber(''), null);
  assert.strictEqual(dialableNumber(undefined), null);
});
