import * as cheerio from 'cheerio';
import { DEFAULT_HEALTH_CENTER_DOC } from '@iitj1/types';
import { config } from '../config';
import { getHealthCenter, syncHealthCenter } from '../store';
import { invalidateModule } from '../cache';
import type {
  HealthCenterDoc,
  MedicalOfficer,
  VisitingSpecialist,
  DoctorScheduleEntry,
  DoctorScheduleDay,
  Hospital,
  Contact,
} from '../types';

const MAIN_URL = 'https://www.iitj.ac.in/health-center';
const CONTACT_URL = 'https://www.iitj.ac.in/health-center/en/contact';
const DOCTORS_SCHEDULE_URL = DEFAULT_HEALTH_CENTER_DOC.doctorScheduleUrl;
const FETCH_TIMEOUT_MS = 10_000;

/** Contact page labels don't always match the display names we want. */
const CONTACT_LABEL_MAP: Record<string, string> = {
  'Office of PHC': 'Health Center Office',
  'PIC Contact No': 'Professor In-Charge',
};

const STATIC_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_SYNC_INTERVAL_MS = 30 * 60 * 1000;

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function normalizePhone(digits: string): string {
  const clean = digits.replace(/\s+/g, '');
  if (clean.length === 11 && clean.startsWith('0291')) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}

function parseMedicalOfficers($: cheerio.CheerioAPI): MedicalOfficer[] {
  const officers: MedicalOfficer[] = [];
  $('li').each((_, el) => {
    const text = cleanText($(el).text());
    if (/^Dr\.\s+\S/.test(text) && text.length < 60) {
      officers.push({ name: text });
    }
  });
  return officers;
}

/** Generic fallback specialty list from the main page's prose — used only when no worksheet-based schedule is available at all. */
function parseVisitingSpecialistsFallback($: cheerio.CheerioAPI): VisitingSpecialist[] {
  const anchor = $('p')
    .filter((_, el) => cleanText($(el).text()).includes('Specialist doctors from various disciplines visit the HC weekly'))
    .first();
  const list = anchor.nextAll('ul').first();
  const specialists: VisitingSpecialist[] = [];
  list.find('li').each((_, el) => {
    const text = cleanText($(el).text());
    if (text) specialists.push({ specialty: text });
  });
  return specialists;
}

function parseServices($: cheerio.CheerioAPI): string[] {
  const anchor = $('p')
    .filter((_, el) => cleanText($(el).text()).includes('facilities are available at the Health Centre'))
    .first();
  const list = anchor.nextAll('ol').first();
  const services: string[] = [];
  list.find('li').each((_, el) => {
    const text = cleanText($(el).text()).replace(/[,.]$/, '');
    if (text) services.push(text);
  });
  return services;
}

function parseHospitals($: cheerio.CheerioAPI): Hospital[] {
  const anchor = $('p').filter((_, el) => cleanText($(el).text()).includes('These include')).first();
  const text = cleanText(anchor.text());
  const hospitals: Hospital[] = [];
  const re = /\((\d+)\)\s*([^,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[2].trim().replace(/\.$/, '').replace(/^and\s+/i, '');
    if (name) hospitals.push({ name });
  }
  return hospitals;
}

function parseAddress($: cheerio.CheerioAPI): string | null {
  const raw = cleanText($('a[href*="maps.app.goo.gl"]').first().text());
  if (!raw) return null;
  return `Office of Health Center, Indian Institute of Technology Jodhpur, ${raw}`;
}

function parseMainPage(html: string): {
  medicalOfficers: MedicalOfficer[];
  visitingSpecialistsFallback: VisitingSpecialist[];
  services: string[];
  hospitals: Hospital[];
  address: string | null;
} {
  const $ = cheerio.load(html);
  return {
    medicalOfficers: parseMedicalOfficers($),
    visitingSpecialistsFallback: parseVisitingSpecialistsFallback($),
    services: parseServices($),
    hospitals: parseHospitals($),
    address: parseAddress($),
  };
}

function parseContactPage(html: string): Contact[] {
  const $ = cheerio.load(html);
  const contacts: Contact[] = [];
  $('li').each((_, el) => {
    const p = $(el).find('p').first();
    const text = cleanText((p.length > 0 ? p : $(el)).text());
    const match = text.match(/^(.+?):\s*([\d\s]{8,})$/);
    if (!match) return;
    const rawLabel = match[1].trim();
    const label = CONTACT_LABEL_MAP[rawLabel] ?? rawLabel;
    const phone = normalizePhone(match[2]);
    if (!['Campus Security', 'Ambulance', 'Fire'].includes(label) && !['100', '108', '101'].includes(phone)) {
      contacts.push({ label, phone });
    }
  });
  return contacts;
}

/**
 * Checks for the Google Sheet <iframe> the doctors-schedule page is expected to embed.
 * A real cheerio parse against raw HTML sees iframes (unlike an HTML->markdown conversion,
 * which strips them) — this is the check that matters, not a repeat of any earlier probe.
 */
function findDoctorScheduleIframe(html: string): string | null {
  const $ = cheerio.load(html);
  const src = $('iframe').attr('src');
  return src ?? null;
}

/** Extracts the Google Sheets "publish ID" (`2PACX-...`) common to every URL variant for this sheet. */
function extractPublishId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/e\/([^/]+)\//);
  if (!match) throw new Error(`Could not extract Google Sheets publish ID from URL: ${url}`);
  return match[1];
}

function buildCsvUrl(publishId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/e/${publishId}/pub?output=csv&gid=${gid}`;
}

/**
 * Discovers every worksheet tab in the published spreadsheet — no hardcoded gids or names.
 * A modern Google Sheets `pubhtml` page renders its grid via client-side JS (so cheerio never
 * sees a <table>), but the tab list itself is bootstrapped from a plain JS array literal
 * (`items.push({name: "...", gid: "..."})`) embedded directly in the page's inline <script> —
 * that text is present in the raw HTML regardless of JS execution, so a regex over it is
 * reliable and future-proof: if IITJ adds/removes/reorders tabs, this list changes automatically
 * with zero code changes, since nothing here refers to a specific gid or tab name.
 */
function discoverWorksheets(pubhtml: string): { name: string; gid: string }[] {
  const re = /items\.push\(\{name:\s*"((?:\\.|[^"\\])*)"[^}]*gid:\s*"(\d+)"/g;
  const results: { name: string; gid: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(pubhtml))) {
    const name = match[1].replace(/\\\//g, '/');
    results.push({ name, gid: match[2] });
  }
  return results;
}

/**
 * Turns a worksheet title like "28/07/2026 TUESDAY" or "30/07/2026THURSDAY" (inconsistent
 * spacing in the source, handled either way) into a normalized {date, day} pair. `day` is
 * computed from the parsed date rather than read verbatim off the sheet title — this way a
 * typo'd or missing weekday label in the source can never produce a wrong day name.
 */
function parseWorksheetTitle(name: string): { date: string; day: string } | null {
  const match = cleanText(name).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = `${yyyy}-${mm}-${dd}`;
  const dateObj = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return null;
  const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  return { date, day };
}

/**
 * Minimal RFC4180-style CSV parser (quoted fields, embedded commas, embedded newlines,
 * escaped `""` quotes) — the sheet's own cells contain both embedded commas (e.g. "Dr. Shikha
 * Chhibber, MBBS MD") and embedded newlines (e.g. "Room No. 7 \n(SOPD-1)"), so a naive
 * line-split/comma-split would silently corrupt those rows.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // skip — \r\n line endings
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(s: string): string {
  return cleanText(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, string> = {
  DOCTORSNAME: 'DOCTORSNAME',
  DOCTORNAME: 'DOCTORSNAME',
  ROOMNO: 'ROOMNO',
  ROOMNUMBER: 'ROOMNO',
  ROOM: 'ROOMNO',
  TIMING: 'TIMING',
  TIME: 'TIMING',
  SHIFT: 'SHIFT',
  SPECIALISTS: 'SPECIALTY',
  SPECIALIST: 'SPECIALTY',
  SPECIALITY: 'SPECIALTY',
  SPECIALTY: 'SPECIALTY',
};

interface TableColumnMap {
  headerRow: number;
  doctorNameCol: number;
  roomCol?: number;
  timingCol?: number;
  shiftCol?: number;
  specialtyCol?: number;
}

/**
 * Splits a raw name cell into a clean doctor name plus any embedded qualification, using
 * position of the first comma or hyphen as the split point (qualifications always trail the
 * name) — not a hardcoded list of replacements, so any qualification string works.
 *   "Dr. X- MBBS MD (Internal Medicine)" -> { doctorName: "Dr. X", qualification: "MBBS MD (Internal Medicine)" }
 *   "Dr. Y, MBBS MD"                     -> { doctorName: "Dr. Y", qualification: "MBBS MD" }
 *   "Dr. Z"                              -> { doctorName: "Dr. Z", qualification: undefined }
 */
function splitDoctorNameAndQualification(raw: string): { doctorName: string; qualification?: string } {
  const trimmed = cleanText(raw);
  const commaIdx = trimmed.indexOf(',');
  const dashMatch = trimmed.match(/\s*-\s*/);
  const dashIdx = dashMatch ? (dashMatch.index ?? -1) : -1;

  let splitIdx = -1;
  if (commaIdx === -1 && dashIdx === -1) {
    return { doctorName: trimmed };
  }
  if (commaIdx === -1) splitIdx = dashIdx;
  else if (dashIdx === -1) splitIdx = commaIdx;
  else splitIdx = Math.min(commaIdx, dashIdx);

  const doctorName = trimmed.slice(0, splitIdx).trim();
  const qualification = trimmed
    .slice(splitIdx)
    .replace(/^[,\-\s]+/, '')
    .trim();

  if (!doctorName) return { doctorName: trimmed };
  return qualification ? { doctorName, qualification } : { doctorName };
}

/**
 * Given a header cell's row+column, expands outward left and right along that SAME row while
 * cells stay non-blank — this is a table's column span. A single blank cell (spacer column, or
 * the blank continuation of a merged decorative cell) ends the span in that direction; nothing
 * about this depends on where the anchor cell itself sits within the span, so a table's columns
 * can be in any order.
 */
function expandColumnSpan(row: string[], anchorCol: number): { start: number; end: number } {
  let start = anchorCol;
  while (start - 1 >= 0 && cleanText(row[start - 1] ?? '') !== '') start--;
  let end = anchorCol + 1;
  while (end < row.length && cleanText(row[end] ?? '') !== '') end++;
  return { start, end };
}

function mapTableColumns(row: string[], start: number, end: number): Omit<TableColumnMap, 'headerRow' | 'doctorNameCol'> {
  const map: Partial<TableColumnMap> = {};
  for (let c = start; c < end; c++) {
    const alias = HEADER_ALIASES[normalizeHeader(row[c] ?? '')];
    if (alias === 'ROOMNO') map.roomCol = c;
    else if (alias === 'TIMING') map.timingCol = c;
    else if (alias === 'SHIFT') map.shiftCol = c;
    else if (alias === 'SPECIALTY') map.specialtyCol = c;
  }
  return map;
}

/**
 * Fully layout-independent: every "DOCTOR'S NAME" cell anywhere in the grid is its own
 * independent table anchor — not tied to a single shared header row, so two tables can have
 * their headers on entirely different rows. Each anchor gets its own column span (expanded
 * outward from itself, so column order within a table doesn't matter) and reads its own data
 * rows independently to the true end of the sheet (or until a repeated header for that same
 * span appears further down) — one table finishing early, having a different row count, or
 * having its header several rows below the other table's, cannot affect the other table at all.
 * Decorative title rows (e.g. "REGULAR DOCTORS/ DENTIST") never become anchors because they
 * don't contain recognized header text, so they're inherently skipped, not special-cased.
 */
function parseWorksheetCsv(csvText: string): {
  regularDoctors: DoctorScheduleEntry[];
  visitingSpecialists: VisitingSpecialist[];
} {
  const regularDoctors: DoctorScheduleEntry[] = [];
  const visitingSpecialists: VisitingSpecialist[] = [];
  const rows = parseCsv(csvText);

  const tables: TableColumnMap[] = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (HEADER_ALIASES[normalizeHeader(row[c] ?? '')] !== 'DOCTORSNAME') continue;
      const { start, end } = expandColumnSpan(row, c);
      tables.push({ headerRow: r, doctorNameCol: c, ...mapTableColumns(row, start, end) });
    }
  }

  if (tables.length === 0) {
    console.warn(
      "[healthCenterSync] Could not find any \"DOCTOR'S NAME\" header cell anywhere in the worksheet CSV — nothing to parse.",
    );
    return { regularDoctors, visitingSpecialists };
  }

  for (const table of tables) {
    if (table.shiftCol === undefined && table.specialtyCol === undefined) {
      console.warn(
        `[healthCenterSync] Table anchored at row ${table.headerRow}, column ${table.doctorNameCol} has a DOCTOR'S NAME header but neither a SHIFT nor a SPECIALISTS column nearby — skipping it (cannot classify as regular-doctors or visiting-specialists).`,
      );
    }
  }

  for (const table of tables) {
    for (let r = table.headerRow + 1; r < rows.length; r++) {
      const row = rows[r];

      // A repeated "DOCTOR'S NAME" header at this exact column further down means a new table
      // starts here (e.g. a vertically-stacked repeat of the same layout) — stop this table.
      if (HEADER_ALIASES[normalizeHeader(row[table.doctorNameCol] ?? '')] === 'DOCTORSNAME') break;

      const rawName = cleanText(row[table.doctorNameCol] ?? '');
      if (!rawName) continue;

      if (table.shiftCol !== undefined) {
        regularDoctors.push({
          doctorName: rawName,
          room: cleanText(row[table.roomCol ?? -1] ?? ''),
          timing: cleanText(row[table.timingCol ?? -1] ?? ''),
          shift: cleanText(row[table.shiftCol] ?? ''),
        });
      } else if (table.specialtyCol !== undefined) {
        const { doctorName, qualification } = splitDoctorNameAndQualification(rawName);
        visitingSpecialists.push({
          doctorName,
          qualification,
          specialty: cleanText(row[table.specialtyCol] ?? ''),
          room: cleanText(row[table.roomCol ?? -1] ?? ''),
          timing: cleanText(row[table.timingCol ?? -1] ?? ''),
        });
      }
    }
  }

  return { regularDoctors, visitingSpecialists };
}

/**
 * Discovers every worksheet tab from the iframe's own pubhtml page (the full tab list is present
 * regardless of which specific gid the iframe URL happens to carry), then fetches and parses
 * each tab's CSV independently — one DoctorScheduleDay per worksheet, however many there are.
 */
async function fetchAllDoctorSchedules(iframeSrc: string): Promise<DoctorScheduleDay[]> {
  const publishId = extractPublishId(iframeSrc);
  const pubhtml = await fetchPage(iframeSrc);
  const worksheets = discoverWorksheets(pubhtml);

  if (worksheets.length === 0) {
    console.warn('[healthCenterSync] No worksheet tabs discovered in the published spreadsheet.');
    return [];
  }
  console.log(
    `[healthCenterSync] Discovered ${worksheets.length} worksheet tab(s): ${worksheets.map((w) => w.name).join(', ')}`,
  );

  const days = await Promise.all(
    worksheets.map(async (ws): Promise<DoctorScheduleDay | null> => {
      const title = parseWorksheetTitle(ws.name);
      if (!title) {
        console.warn(`[healthCenterSync] Could not parse a date from worksheet title "${ws.name}" — skipping it.`);
        return null;
      }
      try {
        const csvUrl = buildCsvUrl(publishId, ws.gid);
        const csvText = await fetchPage(csvUrl);
        const { regularDoctors, visitingSpecialists } = parseWorksheetCsv(csvText);
        console.log(
          `[healthCenterSync] Worksheet "${ws.name}" (${title.date}): ${regularDoctors.length} regular doctors, ${visitingSpecialists.length} visiting specialists.`,
        );
        return { date: title.date, day: title.day, regularDoctors, visitingSpecialists };
      } catch (err) {
        console.warn(`[healthCenterSync] Failed to fetch/parse worksheet "${ws.name}":`, (err as Error).message);
        return null;
      }
    }),
  );

  return days.filter((d): d is DoctorScheduleDay => d !== null).sort((a, b) => a.date.localeCompare(b.date));
}

function computeSignature(doc: HealthCenterDoc): string {
  const { dataSource: _d, lastSyncedAt: _s, lastAttemptedAt: _a, ...rest } = doc;
  return JSON.stringify(rest);
}

async function scrapeCandidateDoc(campusId: string): Promise<Omit<HealthCenterDoc, 'lastAttemptedAt'>> {
  const [mainHtml, contactHtml, scheduleHtml] = await Promise.all([
    fetchPage(MAIN_URL),
    fetchPage(CONTACT_URL),
    fetchPage(DOCTORS_SCHEDULE_URL),
  ]);

  const main = parseMainPage(mainHtml);
  const phcContacts = parseContactPage(contactHtml);
  const scheduleIframeSrc = findDoctorScheduleIframe(scheduleHtml);

  let doctorSchedules: DoctorScheduleDay[] = [];
  if (scheduleIframeSrc) {
    console.log(`[healthCenterSync] Found doctor-schedule iframe: ${scheduleIframeSrc}`);
    doctorSchedules = await fetchAllDoctorSchedules(scheduleIframeSrc);
  } else {
    console.log('[healthCenterSync] No iframe found on doctors-schedule page.');
  }

  const hasMinimumViableContent = main.medicalOfficers.length > 0 && phcContacts.length > 0;
  if (!hasMinimumViableContent) {
    throw new Error('Scraped page(s) missing expected content (selectors may need updating)');
  }

  return {
    campusId,
    medicalOfficers: main.medicalOfficers,
    visitingSpecialists:
      main.visitingSpecialistsFallback.length > 0
        ? main.visitingSpecialistsFallback
        : DEFAULT_HEALTH_CENTER_DOC.visitingSpecialists,
    doctorSchedules,
    hospitals: main.hospitals.length > 0 ? main.hospitals : DEFAULT_HEALTH_CENTER_DOC.hospitals,
    contacts: phcContacts,
    services: main.services.length > 0 ? main.services : DEFAULT_HEALTH_CENTER_DOC.services,
    address: main.address ?? DEFAULT_HEALTH_CENTER_DOC.address,
    officialUrl: DEFAULT_HEALTH_CENTER_DOC.officialUrl,
    doctorScheduleUrl: DEFAULT_HEALTH_CENTER_DOC.doctorScheduleUrl,
    dataSource: 'live',
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function runSync(campusId: string = config.campusId): Promise<void> {
  const lastAttemptedAt = new Date().toISOString();
  try {
    const existing = await getHealthCenter(campusId);

    if (!existing) {
      await syncHealthCenter(
        { campusId, ...DEFAULT_HEALTH_CENTER_DOC, lastAttemptedAt },
        'system@health-center-sync',
      );
      invalidateModule('healthCenter', campusId);
    }

    const candidate = await scrapeCandidateDoc(campusId);
    const fullCandidate: HealthCenterDoc = { ...candidate, lastAttemptedAt };

    const baseline = existing ?? { campusId, ...DEFAULT_HEALTH_CENTER_DOC, lastAttemptedAt: null };
    if (computeSignature(fullCandidate) === computeSignature(baseline)) {
      console.log('[healthCenterSync] No change since last sync — skipping write.');
      return;
    }

    await syncHealthCenter(fullCandidate, 'system@health-center-sync');
    invalidateModule('healthCenter', campusId);
    console.log('[healthCenterSync] Synced fresh data from iitj.ac.in.');
  } catch (err) {
    console.warn('[healthCenterSync] Sync tick failed:', (err as Error).message);
  }
}

export async function runDoctorScheduleOnlySync(campusId: string = config.campusId): Promise<void> {
  const lastAttemptedAt = new Date().toISOString();
  try {
    const existing = await getHealthCenter(campusId);
    if (!existing) return; // full runSync will seed this campus first

    const scheduleHtml = await fetchPage(DOCTORS_SCHEDULE_URL);
    const scheduleIframeSrc = findDoctorScheduleIframe(scheduleHtml);
    if (!scheduleIframeSrc) {
      console.log('[healthCenterSync] Doctor-schedule-only tick: no iframe found.');
      return;
    }

    const doctorSchedules = await fetchAllDoctorSchedules(scheduleIframeSrc);
    const candidate: HealthCenterDoc = { ...existing, doctorSchedules, lastAttemptedAt };

    if (computeSignature(candidate) === computeSignature(existing)) {
      console.log('[healthCenterSync] Doctor-schedule-only tick: no change.');
      return;
    }

    await syncHealthCenter(candidate, 'system@health-center-sync');
    invalidateModule('healthCenter', campusId);
    console.log(
      `[healthCenterSync] Doctor-schedule-only tick: updated ${doctorSchedules.length} worksheet(s) from the Google Sheet.`,
    );
  } catch (err) {
    console.warn('[healthCenterSync] Doctor-schedule-only sync tick failed:', (err as Error).message);
  }
}

let schedulerStarted = false;

export function startHealthCenterSyncScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  void runSync();
  const staticTimer = setInterval(() => void runSync(), STATIC_SYNC_INTERVAL_MS);
  staticTimer.unref?.();

  const scheduleTimer = setInterval(() => void runDoctorScheduleOnlySync(), SCHEDULE_SYNC_INTERVAL_MS);
  scheduleTimer.unref?.();
}

// Exported for unit tests only (apps/api/src/tests/healthCenterSync.test.ts).
export const __testing = {
  parseCsv,
  parseWorksheetCsv,
  splitDoctorNameAndQualification,
  discoverWorksheets,
  parseWorksheetTitle,
  extractPublishId,
  buildCsvUrl,
  normalizeHeader,
};
