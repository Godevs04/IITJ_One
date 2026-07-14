import fs from 'fs';
import path from 'path';
import type { TransportTrip, TransportRouteGroup, ScheduleOverride } from '../types';

function parseTableRows(section: string): string[][] {
  const lines = section.split('\n');
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    if (line.includes('---')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length > 0 && cells[0] !== 'Bus' && cells[0] !== 'Direction') {
      rows.push(cells);
    }
  }
  return rows;
}

function rowsToTrips(rows: string[][], direction: 'departure' | 'arrival'): TransportTrip[] {
  return rows.map((cells) => ({
    bus: cells[0] ?? '',
    startTime: cells[1] ?? '',
    from: cells[2] ?? '',
    endTime: cells[3] ?? '',
    to: cells[4] ?? '',
    route: cells[5] ?? cells[6] ?? '',
    direction,
  }));
}

export function parseTransportMarkdown(filePath: string): {
  routes: TransportRouteGroup[];
  scheduleOverrides: ScheduleOverride[];
} {
  // Normalize CRLF -> LF so the blank-line-sensitive regexes below behave the
  // same regardless of the source file's line endings.
  const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  const routes: TransportRouteGroup[] = [];

  // Terminate on a *standalone* horizontal rule (`\n---\n`), not just any
  // `---` — table separator rows (`|---|---|...|`) also contain "---" and
  // would otherwise truncate the match right after the table header, before
  // any data rows are captured.
  const monSatDep = content.match(
    /## Monday to Saturday[\s\S]*?### Departure from Campus([\s\S]*?)### Arrival at Campus/,
  );
  const monSatArr = content.match(
    /## Monday to Saturday[\s\S]*?### Arrival at Campus([\s\S]*?)\n---\n/,
  );

  if (monSatDep) {
    routes.push({
      weekday: 'mon-sat',
      direction: 'departure',
      trips: rowsToTrips(parseTableRows(monSatDep[1]), 'departure'),
    });
  }
  if (monSatArr) {
    routes.push({
      weekday: 'mon-sat',
      direction: 'arrival',
      trips: rowsToTrips(parseTableRows(monSatArr[1]), 'arrival'),
    });
  }

  const sunDep = content.match(
    /## Sunday & Institute Holidays[\s\S]*?### Departure from Campus([\s\S]*?)### Arrival at Campus/,
  );
  const sunArr = content.match(
    /## Sunday & Institute Holidays[\s\S]*?### Arrival at Campus([\s\S]*?)\n---\n/,
  );

  if (sunDep) {
    routes.push({
      weekday: 'sun-holiday',
      direction: 'departure',
      trips: rowsToTrips(parseTableRows(sunDep[1]), 'departure'),
    });
  }
  if (sunArr) {
    routes.push({
      weekday: 'sun-holiday',
      direction: 'arrival',
      trips: rowsToTrips(parseTableRows(sunArr[1]), 'arrival'),
    });
  }

  const thursdaySection = content.match(
    /### Revised Thursday Schedule[\s\S]*?\n\n([\s\S]*?)\n---\n/,
  );
  const scheduleOverrides: ScheduleOverride[] = [];
  if (thursdaySection) {
    const rows = parseTableRows(thursdaySection[1]);
    scheduleOverrides.push({
      dayOfWeek: 'thursday',
      effectiveFrom: '2026-02-05',
      description:
        'B2 departure revised to 8:00 AM for Surgical Device Development class at AIIMS',
      trips: rows.map((cells) => ({
        bus: cells[1] ?? cells[0] ?? '',
        startTime: cells[2] ?? '',
        from: cells[3] ?? '',
        endTime: cells[4] ?? '',
        to: cells[5] ?? '',
        route: cells[6] ?? '',
        direction: (cells[0] ?? '').toLowerCase().startsWith('arriv')
          ? ('arrival' as const)
          : ('departure' as const),
      })),
    });
  }

  return { routes, scheduleOverrides };
}

export function parseMenuCsv(vegCsv: string, nonVegCsv: string, month: string) {
  const vegDays = parseSingleMenuCsv(vegCsv);
  const nonVegDays = parseSingleMenuCsv(nonVegCsv);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return dayNames.map((dayName) => {
    const veg = vegDays[dayName] ?? {};
    const nonVeg = nonVegDays[dayName] ?? {};
    return {
      date: firstWeekdayDateInMonth(month, dayName),
      dayName: dayName.toLowerCase(),
      breakfast: { veg: veg.BREAKFAST ?? '', nonVeg: nonVeg.BREAKFAST ?? '' },
      lunch: { veg: veg.LUNCH ?? '', nonVeg: nonVeg.LUNCH ?? '' },
      snacks: { veg: veg.SNACKS ?? '', nonVeg: nonVeg.SNACKS ?? '' },
      dinner: { veg: veg.DINNER ?? '', nonVeg: nonVeg.DINNER ?? '' },
    };
  });
}

/** Map weekday template rows to the first real calendar date in `YYYY-MM`. */
export function firstWeekdayDateInMonth(month: string, dayName: string): string {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const wanted = weekdayIndex(dayName);
  if (!year || Number.isNaN(monthIndex) || wanted < 0) {
    return `${month}-01`;
  }

  const cursor = new Date(Date.UTC(year, monthIndex, 1));
  while (cursor.getUTCDay() !== wanted) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cursor.toISOString().slice(0, 10);
}

function weekdayIndex(dayName: string): number {
  const key = dayName.trim().toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return map[key] ?? -1;
}

function parseSingleMenuCsv(csv: string): Record<string, Record<string, string>> {
  const lines = csv.split('\n').filter((l) => l.trim());
  const result: Record<string, Record<string, string>> = {};
  let currentDay = '';

  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    const dayCell = (parts[0] ?? '').trim();
    const meal = (parts[1] ?? '').trim().toUpperCase();
    const items = [parts[2], parts[3], parts[4]]
      .map((s) => (s ? s.trim() : ''))
      .filter((s) => s && s.replace(/[\u2014\u2013-]/g, '').trim() !== '')
      .join(', ');

    if (dayCell) {
      currentDay = dayCell;
    }
    if (!currentDay || !meal) continue;

    if (!result[currentDay]) result[currentDay] = {};
    result[currentDay][meal] = items;
  }

  return result;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function loadMenuFromFiles(docsRoot: string, month = '2026-07') {
  const vegPath = path.join(docsRoot, 'July_veg.xlsx - veg mess July.csv');
  const nonVegPath = path.join(docsRoot, 'July_non_veg.xlsx - Nov Menu.csv');
  const vegCsv = fs.readFileSync(vegPath, 'utf-8');
  const nonVegCsv = fs.readFileSync(nonVegPath, 'utf-8');
  return parseMenuCsv(vegCsv, nonVegCsv, month);
}

export function loadTransportFromFile(docsRoot: string) {
  const transportPath = path.join(docsRoot, 'IITJ_Transport_Schedule.md');
  return parseTransportMarkdown(transportPath);
}
