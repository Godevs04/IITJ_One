/**
 * Reusable announcement generator for transport schedule exceptions and cancellations.
 * Dynamically constructs notice title/body and push notification title/body from:
 * - route
 * - departure time
 * - date (IST calendar day)
 * - origin
 * - destination
 * - cancellation reason (if provided; never invented)
 * - whether other trips continue normally
 */
import { getIstDateString } from '../utils/istTime';

export interface CancellationTripDetails {
  bus?: string;
  route: string;
  startTime: string;
  origin?: string;
  destination?: string;
  direction?: 'departure' | 'arrival';
}

export interface TransportCancellationAnnouncementInput {
  trips: CancellationTripDetails[];
  date: string; // YYYY-MM-DD
  reason?: string | null;
  otherTripsRunning?: boolean;
  todayDateKey?: string; // defaults to current IST date
}

export interface TransportCancellationAnnouncement {
  title: string;
  noticeBody: string;
  pushTitle: string;
  pushBody: string;
  category: 'transport';
  isImportant: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/** "2026-10-05" → "Monday, 5 October" or "Monday 5 October" */
export function formatDayAndDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAY_NAMES[dt.getUTCDay()];
  const month = MONTH_NAMES[dt.getUTCMonth()];
  return `${weekday} ${d} ${month}`;
}

/** Computes next calendar day in YYYY-MM-DD format */
function nextDayKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Cleans and normalizes user-provided reason (dropping placeholders like "Trip cancelled") */
export function cleanCancellationReason(reason?: string | null): string | null {
  if (!reason) return null;
  const trimmed = reason.trim().replace(/[.!?]+$/, '');
  if (!trimmed || /^trip cancelled$/i.test(trimmed) || /^cancelled$/i.test(trimmed) || /^cancellation$/i.test(trimmed)) {
    return null;
  }
  // Capitalize first character
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

export function buildTransportCancellationAnnouncement(
  input: TransportCancellationAnnouncementInput,
): TransportCancellationAnnouncement {
  const { trips, date, otherTripsRunning = true } = input;
  const todayKey = input.todayDateKey ?? getIstDateString();
  const tomorrowKey = nextDayKey(todayKey);

  const cleanedReason = cleanCancellationReason(input.reason);
  const formattedDate = formatDayAndDate(date);

  let dateNoticeClause: string;
  let datePushClause: string;

  if (date === todayKey) {
    dateNoticeClause = `today, ${formattedDate}`;
    datePushClause = 'today';
  } else if (date === tomorrowKey) {
    dateNoticeClause = `tomorrow, ${formattedDate}`;
    datePushClause = 'tomorrow';
  } else {
    dateNoticeClause = `on ${formattedDate}`;
    datePushClause = `on ${formattedDate}`;
  }

  // Single-trip cancellation
  if (trips.length === 1) {
    const t = trips[0];
    const busName = t.bus || t.route;
    const time = t.startTime;
    const origin = t.origin || 'Old Mess';
    const destination = t.destination || 'AIIMS Jodhpur';

    const title = `${busName} ${time} Bus Cancelled`;
    const pushTitle = `${busName} ${time} Bus Cancelled`;

    const otherClause = otherTripsRunning ? ' All other scheduled trips will operate normally.' : '';
    const reasonClause = cleanedReason ? ` Reason: ${cleanedReason}.` : '';

    const noticeBody = `The ${busName} bus from ${origin} to ${destination} scheduled for ${time} ${dateNoticeClause}, has been cancelled.${reasonClause}${otherClause}`;
    const pushBody = `The ${busName} bus from ${origin} to ${destination} has been cancelled ${datePushClause}.${reasonClause}`;

    return {
      title,
      noticeBody,
      pushTitle,
      pushBody,
      category: 'transport',
      isImportant: true,
    };
  }

  // Multi-trip cancellation
  const routes = [...new Set(trips.map((t) => t.route))].join(', ');
  const title = `Bus Cancellation: ${routes}`;
  const pushTitle = `Bus Trips Cancelled (${routes})`;

  const tripDescriptions = trips.map((t) => {
    const origin = t.origin ? `from ${t.origin}` : '';
    const dest = t.destination ? `to ${t.destination}` : '';
    const place = origin && dest ? ` (${origin} ${dest})` : '';
    return `${t.route} at ${t.startTime}${place}`;
  }).join('; ');

  const otherClause = otherTripsRunning ? ' All other scheduled trips will operate normally.' : '';
  const reasonClause = cleanedReason ? ` Reason: ${cleanedReason}.` : '';

  const noticeBody = `The following bus trips scheduled ${dateNoticeClause} have been cancelled: ${tripDescriptions}.${reasonClause}${otherClause}`;
  const pushBody = `Scheduled trips for ${routes} have been cancelled ${datePushClause}.${reasonClause}`;

  return {
    title,
    noticeBody,
    pushTitle,
    pushBody,
    category: 'transport',
    isImportant: true,
  };
}
