import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { firstWeekdayDateInMonth, parseMenuCsv } from '../services/parsers';

describe('firstWeekdayDateInMonth', () => {
  it('maps weekdays to real dates in July 2026', () => {
    // July 2026 starts on Wednesday
    assert.equal(firstWeekdayDateInMonth('2026-07', 'Wednesday'), '2026-07-01');
    assert.equal(firstWeekdayDateInMonth('2026-07', 'Monday'), '2026-07-06');
    assert.equal(firstWeekdayDateInMonth('2026-07', 'Sunday'), '2026-07-05');
  });
});

describe('parseMenuCsv', () => {
  it('builds seven days with weekday-aligned dates', () => {
    const veg = [
      'Day,Meal,Item1,Item2,Item3',
      'Monday,BREAKFAST,Idli,,',
      'Monday,LUNCH,Dal,,',
      ',SNACKS,Tea,,',
      ',DINNER,Roti,,',
      'Tuesday,BREAKFAST,Poha,,',
      ',LUNCH,Rice,,',
      ',SNACKS,Biscuits,,',
      ',DINNER,Curry,,',
    ].join('\n');

    const nonVeg = [
      'Day,Meal,Item1,Item2,Item3',
      'Monday,BREAKFAST,Egg,,',
      'Monday,LUNCH,Chicken,,',
      ',SNACKS,—,,',
      ',DINNER,Fish,,',
    ].join('\n');

    const days = parseMenuCsv(veg, nonVeg, '2026-07');
    assert.equal(days.length, 7);
    assert.equal(days[0].dayName, 'monday');
    assert.equal(days[0].date, '2026-07-06');
    assert.equal(days[0].breakfast.veg, 'Idli');
    assert.equal(days[0].breakfast.nonVeg, 'Egg');
  });
});
