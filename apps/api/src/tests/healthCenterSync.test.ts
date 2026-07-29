import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { __testing } from '../services/healthCenterSync';

const { parseCsv, parseWorksheetCsv, splitDoctorNameAndQualification, discoverWorksheets, parseWorksheetTitle } =
  __testing;

describe('parseCsv', () => {
  it('handles embedded commas and embedded newlines inside quoted fields', () => {
    const csv = 'a,b,c\n1,"Room 7\n(SOPD-1)","Dr. X, MBBS"\n';
    const rows = parseCsv(csv);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[1], ['1', 'Room 7\n(SOPD-1)', 'Dr. X, MBBS']);
  });

  it('handles escaped double quotes', () => {
    const rows = parseCsv('a\n"She said ""hi"""\n');
    assert.deepEqual(rows[1], ['She said "hi"']);
  });
});

describe('splitDoctorNameAndQualification', () => {
  it('splits a dash-separated qualification', () => {
    const r = splitDoctorNameAndQualification('Dr. Chandra Shekhar Bhargava- MBBS MD (Internal Medicine)');
    assert.equal(r.doctorName, 'Dr. Chandra Shekhar Bhargava');
    assert.equal(r.qualification, 'MBBS MD (Internal Medicine)');
  });

  it('splits a comma-separated qualification', () => {
    const r = splitDoctorNameAndQualification('Dr. Shikha Chhibber, MBBS MD');
    assert.equal(r.doctorName, 'Dr. Shikha Chhibber');
    assert.equal(r.qualification, 'MBBS MD');
  });

  it('leaves a plain name untouched when there is no delimiter', () => {
    const r = splitDoctorNameAndQualification('Dr. Shuchi Bhargava');
    assert.equal(r.doctorName, 'Dr. Shuchi Bhargava');
    assert.equal(r.qualification, undefined);
  });

  it('picks whichever delimiter (comma or dash) occurs first', () => {
    const r = splitDoctorNameAndQualification('Dr. A - B, C');
    assert.equal(r.doctorName, 'Dr. A');
    assert.equal(r.qualification, 'B, C');
  });
});

describe('parseWorksheetCsv — header-driven, no hardcoded columns/rows/tables', () => {
  it('parses the real sheet layout (3 regular doctors, 3 specialists)', () => {
    const csv = [
      "REGULAR DOCTORS/ DENTIST,,,,,,VISITING SPECIALISTS DOCTORS,,,,",
      "S.NO,DOCTOR'S NAME,ROOM NO.,TIMING,Shift,,S.NO,DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING",
      '1,Dr. Neha Sharma,Room No. 6 (OPD-1),08:00-14:00,Morning,,1,Dr. Chandra Shekhar Bhargava- MBBS MD,Physician,Room No. 7,03:00 PM to 06:30 PM',
      '2,Dr. Anukriti,Room No. 6 (OPD-1),14:00-20:00,Evening,,2,Dr. Shuchi Bhargava,Gynaecology,Room No. 8,03:00 PM to 06:30 PM',
      '3,Dr. Bhuvnesh Kumar,Room No. 6 (OPD-1),20:00-08:00,Night,,3,Dr. Shikha Chhibber,Psychiatry,Room No. 10,05:00 PM to 07:00 PM',
    ].join('\n');

    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 3);
    assert.equal(visitingSpecialists.length, 3);
    assert.deepEqual(regularDoctors[0], {
      doctorName: 'Dr. Neha Sharma',
      room: 'Room No. 6 (OPD-1)',
      timing: '08:00-14:00',
      shift: 'Morning',
    });
    assert.equal(visitingSpecialists[0].doctorName, 'Dr. Chandra Shekhar Bhargava');
    assert.equal(visitingSpecialists[0].qualification, 'MBBS MD');
  });

  it('still works with more rows than the "known" example (row count is never assumed)', () => {
    const rows = ['S.NO,DOCTOR\'S NAME,ROOM NO.,TIMING,Shift'];
    for (let i = 1; i <= 12; i++) {
      rows.push(`${i},Dr. Person ${i},Room ${i},08:00-14:00,Morning`);
    }
    const { regularDoctors } = parseWorksheetCsv(rows.join('\n'));
    assert.equal(regularDoctors.length, 12);
    assert.equal(regularDoctors[11].doctorName, 'Dr. Person 12');
  });

  it('still works with fewer rows (one doctor only)', () => {
    const csv = ["S.NO,DOCTOR'S NAME,ROOM NO.,TIMING,Shift", '1,Dr. Solo,Room 1,08:00-14:00,Morning'].join('\n');
    const { regularDoctors } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 1);
  });

  it('still works when columns are reordered (headers looked up by name, not position)', () => {
    const csv = [
      "SHIFT,S.NO,TIMING,DOCTOR'S NAME,ROOM NO.",
      'Morning,1,08:00-14:00,Dr. Reordered,Room 9',
    ].join('\n');
    const { regularDoctors } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 1);
    assert.deepEqual(regularDoctors[0], {
      doctorName: 'Dr. Reordered',
      room: 'Room 9',
      timing: '08:00-14:00',
      shift: 'Morning',
    });
  });

  it('picks up additional specialists added to the sheet, and different timings/rooms, without any code change', () => {
    const csv = [
      "S.NO,DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING",
      '1,Dr. A,Cardiology,Room 20,09:00 AM to 11:00 AM',
      '2,Dr. B,Dermatology,Room 21,11:00 AM to 01:00 PM',
      '3,Dr. C,Neurology,Room 22,01:00 PM to 03:00 PM',
      '4,Dr. D,Oncology,Room 23,03:00 PM to 05:00 PM',
    ].join('\n');
    const { visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(visitingSpecialists.length, 4);
    assert.equal(visitingSpecialists[3].specialty, 'Oncology');
    assert.equal(visitingSpecialists[3].room, 'Room 23');
    assert.equal(visitingSpecialists[3].timing, '03:00 PM to 05:00 PM');
  });

  it('handles two tables with different row counts independently (no shared blank-row cutoff)', () => {
    const csv = [
      "REGULAR,,,,,,VISITING,,,,",
      "S.NO,DOCTOR'S NAME,ROOM NO.,TIMING,Shift,,S.NO,DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING",
      '1,Dr. A,Room 1,08:00-14:00,Morning,,1,Dr. X,Cardiology,Room 5,09:00 AM',
      ',,,,,,2,Dr. Y,Dermatology,Room 6,10:00 AM',
      ',,,,,,3,Dr. Z,Neurology,Room 7,11:00 AM',
    ].join('\n');
    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 1);
    assert.equal(visitingSpecialists.length, 3);
  });

  it('returns empty arrays (not a throw) and is debuggable when no header row is found', () => {
    const csv = 'just,some,random,csv,data\n1,2,3,4,5';
    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 0);
    assert.equal(visitingSpecialists.length, 0);
  });

  it('works when the two tables have their header row on DIFFERENT physical rows', () => {
    // Regular-doctors table starts one row earlier than visiting-specialists — nothing shares a
    // single "the" header row here.
    const csv = [
      "DOCTOR'S NAME,ROOM NO.,TIMING,Shift",
      'Dr. A,Room 1,08:00-14:00,Morning',
      'Dr. B,Room 1,14:00-20:00,Evening',
      "",
      "DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING",
      'Dr. X,Cardiology,Room 5,09:00 AM',
    ].join('\n');
    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 2);
    assert.equal(visitingSpecialists.length, 1);
    assert.equal(visitingSpecialists[0].doctorName, 'Dr. X');
  });

  it('ignores a decorative title row that sits above only one of the two tables', () => {
    const csv = [
      "SOME DECORATIVE TITLE ONLY OVER THIS TABLE,,,,,,,,,",
      "DOCTOR'S NAME,ROOM NO.,TIMING,Shift,,,DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING",
      'Dr. A,Room 1,08:00-14:00,Morning,,,Dr. X,Cardiology,Room 5,09:00 AM',
    ].join('\n');
    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 1);
    assert.equal(visitingSpecialists.length, 1);
  });

  it('handles an empty visiting-specialists table (header present, zero data rows) without affecting regular doctors', () => {
    const csv = [
      "DOCTOR'S NAME,ROOM NO.,TIMING,Shift,,DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING",
      'Dr. A,Room 1,08:00-14:00,Morning',
      'Dr. B,Room 1,14:00-20:00,Evening',
      'Dr. C,Room 1,20:00-08:00,Night',
    ].join('\n');
    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 3);
    assert.equal(visitingSpecialists.length, 0);
  });

  it('a table with far more rows than the other is read to its own true end, unaffected by the shorter table', () => {
    const rows = ["DOCTOR'S NAME,ROOM NO.,TIMING,Shift,,DOCTOR'S NAME,SPECIALISTS,ROOM NO.,TIMING"];
    rows.push('Dr. Solo,Room 1,08:00-14:00,Morning,,Dr. 1,Cardiology,Room A,09:00 AM');
    for (let i = 2; i <= 20; i++) {
      rows.push(`,,,,,Dr. ${i},Specialty ${i},Room ${i},10:00 AM`);
    }
    const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(rows.join('\n'));
    assert.equal(regularDoctors.length, 1);
    assert.equal(visitingSpecialists.length, 20);
    assert.equal(visitingSpecialists[19].doctorName, 'Dr. 20');
  });

  it('an inserted extra column (not one of the recognized headers) is simply ignored', () => {
    const csv = [
      "DOCTOR'S NAME,DEPARTMENT,ROOM NO.,TIMING,Shift",
      'Dr. A,Medicine,Room 1,08:00-14:00,Morning',
    ].join('\n');
    const { regularDoctors } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 1);
    assert.equal(regularDoctors[0].doctorName, 'Dr. A');
    assert.equal(regularDoctors[0].room, 'Room 1');
  });

  it('a deleted column (TIMING missing entirely) still parses the columns that remain', () => {
    const csv = ["DOCTOR'S NAME,ROOM NO.,Shift", 'Dr. A,Room 1,Morning'].join('\n');
    const { regularDoctors } = parseWorksheetCsv(csv);
    assert.equal(regularDoctors.length, 1);
    assert.equal(regularDoctors[0].doctorName, 'Dr. A');
    assert.equal(regularDoctors[0].timing, '');
  });

  it('stops a table at a repeated header for the same column (vertically-stacked repeat), rather than reading past it', () => {
    const csv = [
      "DOCTOR'S NAME,ROOM NO.,TIMING,Shift",
      'Dr. A,Room 1,08:00-14:00,Morning',
      "DOCTOR'S NAME,ROOM NO.,TIMING,Shift",
      'Dr. B,Room 2,08:00-14:00,Morning',
    ].join('\n');
    const { regularDoctors } = parseWorksheetCsv(csv);
    // Two independent anchors are found (one per header occurrence); the first table's read
    // stops right at the second header instead of swallowing it as a bogus "doctor" row.
    assert.equal(regularDoctors.length, 2);
    assert.ok(regularDoctors.every((d) => d.doctorName !== "DOCTOR'S NAME"));
  });
});

describe('discoverWorksheets — dynamic worksheet-tab discovery', () => {
  function bootstrap(entries: { name: string; gid: string }[]): string {
    const lines = entries.map(
      (e) => `items.push({name: "${e.name.replace(/\//g, '\\/')}", pageUrl: "https:\\/\\/example.com", gid: "${e.gid}"});`,
    );
    return `<script>${lines.join('\n')}</script>`;
  }

  it('discovers a single worksheet', () => {
    const html = bootstrap([{ name: '28/07/2026 TUESDAY', gid: '111' }]);
    const result = discoverWorksheets(html);
    assert.equal(result.length, 1);
    assert.equal(result[0].gid, '111');
  });

  it('discovers multiple worksheets, however many there are', () => {
    const html = bootstrap([
      { name: '28/07/2026 TUESDAY', gid: '111' },
      { name: '29/07/2026 WEDNESDAY', gid: '222' },
      { name: '30/07/2026 THURSDAY', gid: '333' },
      { name: '31/07/2026 FRIDAY', gid: '444' },
    ]);
    const result = discoverWorksheets(html);
    assert.equal(result.length, 4);
    assert.deepEqual(result.map((r) => r.gid), ['111', '222', '333', '444']);
  });

  it('discovers worksheets regardless of their order in the source', () => {
    const html = bootstrap([
      { name: '30/07/2026 THURSDAY', gid: '333' },
      { name: '28/07/2026 TUESDAY', gid: '111' },
      { name: '29/07/2026 WEDNESDAY', gid: '222' },
    ]);
    const result = discoverWorksheets(html);
    assert.equal(result.length, 3);
    assert.deepEqual(
      new Set(result.map((r) => r.gid)),
      new Set(['333', '111', '222']),
    );
  });

  it('reflects an added worksheet with zero code changes', () => {
    const before = discoverWorksheets(bootstrap([{ name: '28/07/2026 TUESDAY', gid: '111' }]));
    const after = discoverWorksheets(
      bootstrap([
        { name: '28/07/2026 TUESDAY', gid: '111' },
        { name: '29/07/2026 WEDNESDAY', gid: '222' },
      ]),
    );
    assert.equal(before.length, 1);
    assert.equal(after.length, 2);
  });

  it('reflects a removed worksheet with zero code changes', () => {
    const before = discoverWorksheets(
      bootstrap([
        { name: '28/07/2026 TUESDAY', gid: '111' },
        { name: '29/07/2026 WEDNESDAY', gid: '222' },
      ]),
    );
    const after = discoverWorksheets(bootstrap([{ name: '29/07/2026 WEDNESDAY', gid: '222' }]));
    assert.equal(before.length, 2);
    assert.equal(after.length, 1);
    assert.equal(after[0].gid, '222');
  });

  it('returns an empty list (not a throw) when the bootstrap script is absent', () => {
    const result = discoverWorksheets('<html><body>no schedule here</body></html>');
    assert.equal(result.length, 0);
  });
});

describe('parseWorksheetTitle', () => {
  it('parses a title with a space before the weekday', () => {
    const r = parseWorksheetTitle('28/07/2026 TUESDAY');
    assert.deepEqual(r, { date: '2026-07-28', day: 'Tuesday' });
  });

  it('parses a title with no space before the weekday (real sheet has this inconsistency)', () => {
    const r = parseWorksheetTitle('30/07/2026THURSDAY');
    assert.deepEqual(r, { date: '2026-07-30', day: 'Thursday' });
  });

  it('computes the weekday from the date rather than trusting the sheet text', () => {
    // Mislabel the day on purpose — the computed weekday must still be correct.
    const r = parseWorksheetTitle('28/07/2026 NOTADAY');
    assert.equal(r?.date, '2026-07-28');
    assert.equal(r?.day, 'Tuesday'); // 2026-07-28 is genuinely a Tuesday
  });

  it('returns null for a title with no parseable date', () => {
    assert.equal(parseWorksheetTitle('Sheet1'), null);
  });
});
