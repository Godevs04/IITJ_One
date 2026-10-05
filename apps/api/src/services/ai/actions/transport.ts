import { istDayBounds, tripTimeToMinutes, type ServiceTrip, type TransportAlert } from '@iitj1/types';
import { getTransport, getTransportAlerts, getTransportScheduleExceptionForDay } from '../../../store';
import { getIstMinutesOfDay } from '../../../utils/istTime';
import { createTransportAlert, updateTransportAlert } from '../../transportAlerts';
import { createScheduleException, deleteScheduleException, previewTripsForDate, publishScheduleException } from '../../transportExceptions';
import { addDays, formatLongDate, formatShortDate, keywords, minutesToTime, parseTimeCandidates } from '../normalize';
import { ActionError, emptyResolution, str, type ActionContext, type ActionDefinition, type Params, type Resolution } from './types';

const endOfDay = (date: string) => istDayBounds(date).end;
const DIRECTION_LABEL: Record<string, string> = { departure: 'Leaving campus', arrival: 'Coming to campus' };

// ─── Transport alerts ───────────────────────────────────────────────────────────

const PRIORITIES = { info: /^(info|information|low)$/, normal: /^(normal|medium)$/, warning: /^(warning|high|important)$/, critical: /^(critical|urgent|emergency)$/ };
const PRIORITY_LABEL: Record<string, string> = { info: 'Information', normal: 'Normal', warning: 'Warning', critical: 'Critical' };

export const createTransportAlertAction: ActionDefinition = {
  name: 'create_transport_alert',
  fields: [
    { name: 'title', label: 'Title', describe: 'Short alert title (draft one from the message if not given)', kind: 'text', max: 200, required: true, question: 'What should the alert title be?' },
    { name: 'message', label: 'Message', describe: 'What riders should know', kind: 'text', max: 2000, required: true, question: 'What should the alert say?' },
    { name: 'date', label: 'About', describe: 'The day the alert is about (default today)', kind: 'date', question: 'Which day is this about?' },
    { name: 'until', label: 'Shown until', describe: 'Last day the alert is shown (default: the day it is about)', kind: 'date', question: 'Until which date should it be shown?' },
    { name: 'priority', label: 'Priority', describe: 'info | normal | warning | critical', kind: 'enum', enumValues: PRIORITIES, enumLabels: PRIORITY_LABEL, question: 'How important is it?' },
    { name: 'pin', label: 'Pin to home', describe: 'Pin on the app home screen (true/false)', kind: 'boolean', question: 'Pin it to the home screen?' },
  ],
  defaults: (p, ctx) => ({ date: str(p.date) ?? ctx.today, until: str(p.until) ?? str(p.date) ?? ctx.today, priority: 'warning', pin: false }),
  resolve: async (p) => emptyResolution(p),
  validate: async (p, _r, ctx) => {
    if (String(p.date) < ctx.today) return [{ field: 'date', message: "That date has passed." }];
    if (String(p.until) < String(p.date)) return [{ field: 'until', message: 'The end date is before the day it is about.' }];
    return [];
  },
  preview: async (p) => ({
    title: 'Post transport alert',
    rows: [
      { label: 'Title', value: String(p.title) },
      { label: 'Message', value: String(p.message) },
      { label: 'Priority', value: PRIORITY_LABEL[String(p.priority)] },
      { label: 'Shown', value: `From now until the end of ${formatShortDate(String(p.until))}` },
      ...(p.pin ? [{ label: 'Pinned to home', value: 'Yes' }] : []),
    ],
    warnings: [],
    notification: "No — shown in the app's transport alerts (no push)",
  }),
  execute: async (p, _r, ctx) => {
    const { value } = await createTransportAlert(
      ctx.campusId,
      {
        title: String(p.title),
        message: String(p.message),
        priority: p.priority as TransportAlert['priority'],
        category: 'service_update',
        startDate: ctx.now.toISOString(),
        endDate: endOfDay(String(p.until)).toISOString(),
        isActive: true,
        pinToHome: p.pin === true,
        overrideSchedule: false,
      },
      ctx.admin.email,
    );
    if (!value.ok) throw new ActionError(value.reason === 'invalid' ? value.errors.join(' ') : 'Could not save the alert.');
    return { summary: `Posted transport alert “${p.title}”`, message: `Done — the transport alert “${p.title}” is live.` };
  },
};

async function resolveAlert(p: Params, ctx: ActionContext, r: Resolution): Promise<TransportAlert | null> {
  const ref = str(p.alert);
  const alerts = (await getTransportAlerts(ctx.campusId))?.alerts ?? [];
  const opts = (list: TransportAlert[]) => list.slice(0, 6).map((a) => ({ label: `${a.title}${a.isActive ? '' : ' (off)'}`, value: a.id }));
  if (!ref) {
    if (alerts.length) r.options.alert = opts(alerts);
    return null;
  }
  const byId = alerts.find((a) => a.id === ref);
  const words = keywords(ref);
  const matches = byId
    ? [byId]
    : alerts.filter((a) => words.length > 0 && words.every((w) => `${a.title} ${a.message}`.toLowerCase().includes(w)));
  if (matches.length === 1) {
    r.entities.push({ field: 'alert', kind: 'transport_alert', id: matches[0].id, label: matches[0].title });
    r.params.alert = matches[0].id;
    return matches[0];
  }
  if (matches.length > 1) {
    delete r.params.alert;
    r.questions.alert = 'More than one alert matches. Which one?';
    r.options.alert = opts(matches);
  } else {
    r.fieldErrors.alert = `I couldn't find a transport alert matching “${ref.slice(0, 60)}”.`;
    if (alerts.length) r.options.alert = opts(alerts);
  }
  return null;
}

export const updateTransportAlertAction: ActionDefinition = {
  name: 'update_transport_alert',
  fields: [
    { name: 'alert', label: 'Alert', describe: 'Which existing alert (words from its title or message)', kind: 'ref', max: 200, required: true, question: 'Which transport alert do you mean?' },
    { name: 'title', label: 'Title', describe: 'New title', kind: 'text', max: 200, question: 'What should the new title be?' },
    { name: 'message', label: 'Message', describe: 'New message', kind: 'text', max: 2000, question: 'What should it say now?' },
    { name: 'until', label: 'Shown until', describe: 'New last day', kind: 'date', question: 'Until which date?' },
    { name: 'active', label: 'Active', describe: 'Turn the alert on (true) or off (false)', kind: 'boolean', question: 'Should it be on or off?' },
  ],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const alert = await resolveAlert(p, ctx, r);
    if (alert) {
      r.data.alert = alert;
      if ([p.title, p.message, p.until, p.active].every((v) => v === undefined)) {
        r.extraMissing = { field: 'message', question: `What should I change in “${alert.title}”? A new message, a new end date, or turn it off?` };
      }
    }
    return r;
  },
  validate: async (p, r, ctx) => {
    if (p.until !== undefined && String(p.until) < ctx.today) return [{ field: 'until', message: "The end date can't be in the past." }];
    const a = r.data.alert as TransportAlert;
    if ((p.active === undefined || p.active === a.isActive) && (p.title ?? a.title) === a.title && (p.message ?? a.message) === a.message && p.until === undefined) {
      return [{ message: 'That would not change anything.' }];
    }
    return [];
  },
  preview: async (p, r) => {
    const a = r.data.alert as TransportAlert;
    const rows: { label: string; value: string; before?: string }[] = [{ label: 'Alert', value: a.title }];
    if (p.title !== undefined) rows.push({ label: 'Title', before: a.title, value: String(p.title) });
    if (p.message !== undefined) rows.push({ label: 'Message', before: a.message, value: String(p.message) });
    if (p.until !== undefined) rows.push({ label: 'Shown until', before: formatShortDate(a.endDate.slice(0, 10)), value: formatShortDate(String(p.until)) });
    if (p.active !== undefined) rows.push({ label: 'Status', before: a.isActive ? 'On' : 'Off', value: p.active ? 'On' : 'Off' });
    return { title: 'Edit transport alert', rows, warnings: [], notification: 'No' };
  },
  execute: async (p, r, ctx) => {
    const a = r.data.alert as TransportAlert;
    const patch: Partial<TransportAlert> = {};
    if (p.title !== undefined) patch.title = String(p.title);
    if (p.message !== undefined) patch.message = String(p.message);
    if (p.until !== undefined) patch.endDate = endOfDay(String(p.until)).toISOString();
    if (p.active !== undefined) patch.isActive = p.active === true;
    const { value } = await updateTransportAlert(ctx.campusId, a.id, patch, ctx.admin.email);
    if (!value.ok) throw new ActionError(value.reason === 'invalid' ? value.errors.join(' ') : 'That alert no longer exists.');
    return { summary: `Edited transport alert “${a.title}”`, message: `Done — “${a.title}” is updated.` };
  },
};

// ─── Bus trip cancellation ─────────────────────────────────────────────────────

async function knownBuses(campusId: string): Promise<string[]> {
  const t = await getTransport(campusId);
  const buses = new Set<string>();
  for (const g of t?.routes ?? []) for (const trip of g.trips) buses.add(trip.bus);
  for (const o of t?.scheduleOverrides ?? []) for (const trip of o.trips) buses.add(trip.bus);
  return [...buses].sort();
}

/** "Route 3" / "bus 3" / "B3" / "b 3" / a stop name → one bus id from the timetable. */
function matchBus(ref: string, buses: string[], routesText: Map<string, string>): string[] {
  const t = ref.trim().toLowerCase();
  const exact = buses.filter((b) => b.toLowerCase() === t);
  if (exact.length) return exact;
  const num = /(?:^|\b)(?:route|bus|b)?\s*(?:no\.?|number|#)?\s*(\d+)\b/.exec(t);
  if (num) return buses.filter((b) => b.replace(/\D/g, '') === num[1]);
  const words = keywords(t);
  if (!words.length) return [];
  return buses.filter((b) => words.every((w) => (routesText.get(b) ?? '').includes(w)));
}

const tripLabel = (t: ServiceTrip) => `${t.startTime} · ${t.from} → ${t.to}`;

export const cancelBusTripAction: ActionDefinition = {
  name: 'cancel_bus_trip',
  fields: [
    { name: 'route', label: 'Bus', describe: 'Which bus/route, as the admin said it (e.g. "Route 3", "B1")', kind: 'ref', max: 60, required: true, question: 'Which bus would you like to cancel?' },
    { name: 'date', label: 'Date', describe: 'Date of the trip', kind: 'date', required: true, question: 'Which date should I cancel it?' },
    { name: 'time', label: 'Trip', describe: 'Departure time of the trip (e.g. "5 PM")', kind: 'time', required: true, question: 'Which trip — at what time?' },
    { name: 'direction', label: 'Direction', describe: 'departure (leaving campus) | arrival (coming to campus) — only if needed', kind: 'enum', enumValues: { departure: /^(departure|leaving|from campus|outbound|leaving campus)$/, arrival: /^(arrival|to campus|returning|inbound|coming back|coming to campus)$/ }, enumLabels: DIRECTION_LABEL, question: 'Leaving campus or coming to campus?' },
    { name: 'reason', label: 'Reason', describe: 'Reason for cancellation (optional, never invented)', kind: 'text', required: false, question: 'Why is this trip cancelled?' },
    { name: 'timeOfDay', label: 'Time of Day', describe: 'morning, afternoon, evening, night', kind: 'ref', required: false, question: 'Which time of day?' },
  ],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const transport = await getTransport(ctx.campusId);
    const buses = await knownBuses(ctx.campusId);
    const routesText = new Map<string, string>();
    for (const g of transport?.routes ?? []) for (const trip of g.trips) routesText.set(trip.bus, `${routesText.get(trip.bus) ?? ''} ${trip.route} ${trip.from} ${trip.to}`.toLowerCase());
    r.options.route = buses.map((b) => ({ label: b, value: b }));

    if (p.reason) {
      r.params.reason = p.reason;
    }
    if (p.timeOfDay) {
      r.params.timeOfDay = p.timeOfDay;
    }

    // Bus
    let bus: string | null = null;
    const ref = str(p.route);
    if (ref) {
      const matches = matchBus(ref, buses, routesText);
      if (matches.length === 1) {
        bus = matches[0];
        r.params.route = bus;
        r.entities.push({ field: 'route', kind: 'bus', id: bus, label: bus, source: 'Timetable' });
      } else if (matches.length > 1) {
        delete r.params.route;
        r.questions.route = `More than one bus matches “${ref}”. Which one?`;
        r.options.route = matches.map((b) => ({ label: b, value: b }));
      } else {
        r.fieldErrors.route = `There's no ${ref} in the bus timetable — the buses are ${buses.join(', ')}.`;
      }
    }
    r.questions.date = bus ? `Which date should I cancel ${bus}?` : 'Which date?';

    // Date
    const date = str(p.date);
    if (date && date < ctx.today) r.fieldErrors.date = 'That date has already passed.';
    if (!bus || !date || date < ctx.today) return r;

    const { start, end } = istDayBounds(date);
    const existing = await getTransportScheduleExceptionForDay(ctx.campusId, start, end);
    if (existing) {
      r.fieldErrors.date = `${formatShortDate(date)} already has a special schedule (“${existing.title}”). Change trips on that day under Transport → Temporary Schedules, or pick another date.`;
      return r;
    }
    const day = await previewTripsForDate(ctx.campusId, date);
    let trips = day.trips.filter((t) => t.bus === bus && t.serviceStatus !== 'cancelled');
    if (date === ctx.today) {
      const nowMin = getIstMinutesOfDay(ctx.now);
      trips = trips.filter((t) => tripTimeToMinutes(t.startTime) > nowMin);
    }
    if (trips.length === 0) {
      r.fieldErrors.date = `${bus} has no ${date === ctx.today ? 'more ' : ''}trips on ${formatShortDate(date)}.`;
      return r;
    }
    r.data.otherTripCount = day.trips.length - 1;
    const sameDirection = (t: ServiceTrip) => !p.direction || (t.direction ?? 'departure') === p.direction;
    const optionsFor = (list: ServiceTrip[]) =>
      list.map((t) => ({ label: `${tripLabel(t)}${list.some((o) => o !== t && o.startTime === t.startTime) ? ` (${DIRECTION_LABEL[t.direction ?? 'departure'].toLowerCase()})` : ''}`, value: t.startTime }));

    if (!p.time && (p.timeOfDay || r.params.timeOfDay)) {
      const tod = String(p.timeOfDay || r.params.timeOfDay).toLowerCase();
      const todTrips = trips.filter((t) => {
        const mins = tripTimeToMinutes(t.startTime);
        if (tod === 'morning') return mins < 12 * 60;
        if (tod === 'afternoon') return mins >= 12 * 60 && mins < 17 * 60;
        if (tod === 'evening') return mins >= 16 * 60 && mins < 21 * 60;
        if (tod === 'night') return mins >= 20 * 60;
        return true;
      });
      if (todTrips.length > 0) {
        trips = todTrips;
        const countWord = trips.length === 2 ? 'two' : trips.length === 3 ? 'three' : `${trips.length}`;
        const dateWord = date === ctx.today ? 'today' : date === addDays(ctx.today, 1) ? 'tomorrow' : `on ${formatShortDate(date)}`;
        r.questions.time = `${bus} has ${countWord} ${tod} trips ${dateWord}. Which one?`;
      }
    }

    r.options.time = optionsFor(trips.filter(sameDirection));
    const times = [...new Set(trips.map((t) => t.startTime))];
    if (!r.questions.time) {
      r.questions.time =
        times.length === 1
          ? `${bus} has one trip on ${formatShortDate(date)}, at ${times[0]}.`
          : `${bus} has trips at ${times.slice(0, -1).join(', ')} and ${times[times.length - 1]} on ${formatShortDate(date)}. Which one should I cancel?`;
    }

    // Trip
    let chosen: ServiceTrip[] = [];
    const time = str(p.time);
    if (time) {
      const candidates = parseTimeCandidates(time);
      chosen = trips.filter((t) => candidates.includes(tripTimeToMinutes(t.startTime)) && sameDirection(t));
      if (candidates.length === 0) r.fieldErrors.time = `I couldn't read the time “${time}”.`;
      else if (chosen.length === 0) r.fieldErrors.time = `${bus} has no ${minutesToTime(candidates[candidates.length - 1])} trip on ${formatShortDate(date)}.`;
    } else if (trips.length === 1) {
      chosen = trips; // the only trip that day — no need to ask
    }
    if (chosen.length > 1) {
      r.questions.direction = `${bus} has two trips at ${chosen[0].startTime}. Leaving campus or coming to campus?`;
      r.extraMissing = { field: 'direction', question: r.questions.direction, options: chosen.map((t) => ({ label: `${DIRECTION_LABEL[t.direction ?? 'departure']} (${t.from} → ${t.to})`, value: t.direction ?? 'departure' })) };
      return r;
    }
    if (chosen.length === 1) {
      const trip = chosen[0];
      r.params.time = trip.startTime;
      // The direction stays derived (in data.trip) unless the admin chose it, so a later time correction can
      // pick a trip in either direction.
      r.data.trip = trip;
      r.data.date = date;
      r.entities.push({ field: 'time', kind: 'trip', id: `${bus}|${trip.startTime}|${trip.direction ?? 'departure'}`, label: `${bus} ${tripLabel(trip)}`, source: 'Timetable' });
    }
    return r;
  },
  validate: async () => [],
  preview: async (p, r) => {
    const trip = r.data.trip as ServiceTrip;
    const others = Number(r.data.otherTripCount ?? 0);
    const dateStr = String(p.date);
    const reason = p.reason ? String(p.reason) : null;
    return {
      title: `Cancel ${p.route}`,
      subtitle: `${trip.startTime} · ${formatLongDate(dateStr)}`,
      rows: [
        { label: 'Bus', value: String(p.route) },
        { label: 'Date', value: formatLongDate(dateStr) },
        { label: 'Time', value: trip.startTime },
        { label: 'Trip', value: `${trip.from} → ${trip.to}` },
        ...(trip.direction ? [{ label: 'Direction', value: DIRECTION_LABEL[trip.direction] ?? trip.direction }] : []),
        ...(reason ? [{ label: 'Reason', value: reason }] : []),
        { label: 'Transport', value: '✓ Cancel scheduled trip' },
        { label: 'Student communication', value: '✓ Publish campus announcement\n✓ Send push notification' },
        { label: 'Other trips', value: others > 0 ? `Unaffected — ${others} other trip${others === 1 ? '' : 's'} that day run as normal` : 'None that day' },
      ],
      warnings: ['This will cancel a scheduled bus trip, publish a campus announcement, and notify students via push notification.'],
      notification: 'Push notification will be sent to students subscribed to Transport updates.',
    };
  },
  execute: async (p, r, ctx) => {
    const trip = r.data.trip as ServiceTrip;
    const date = String(p.date);
    const { start, end } = istDayBounds(date);
    const label = `${p.route} ${trip.startTime} cancelled`;
    const userReason = p.reason ? String(p.reason) : null;
    const { value: draft } = await createScheduleException(
      {
        campusId: ctx.campusId,
        title: label,
        reason: userReason ?? 'Trip cancelled',
        description: `${p.route} ${trip.startTime} (${trip.from} → ${trip.to}) on ${formatLongDate(date)} is cancelled. All other trips run as normal.`,
        effectiveFrom: start.toISOString(),
        effectiveUntil: end.toISOString(),
        priority: 'high',
        affectedBuses: [],
        trips: [],
        mode: 'cancel',
        cancelledTrips: [{ bus: String(p.route), startTime: trip.startTime, direction: trip.direction ?? 'departure' }],
        showBanner: true,
        sendPush: true,
        createNotice: true,
        source: { type: 'api', reference: `ai-command:${ctx.commandId}` },
        attachments: [],
      },
      ctx.admin.email,
    );
    const { value: published } = await publishScheduleException(String(draft._id), ctx.admin.email);
    if (!published.ok) {
      await deleteScheduleException(String(draft._id), ctx.admin.email);
      const why = published.reason === 'validation' ? published.errors.join(' ') : published.reason === 'conflict' ? 'Another special schedule overlaps that day.' : `Could not publish (${published.reason}).`;
      throw new ActionError(why);
    }
    const what = `${p.route} ${trip.startTime} on ${formatShortDate(date)}`;
    return {
      summary: `Cancelled ${what}, published campus announcement, and sent push notification`,
      message: `Done — ${what} is cancelled. A campus announcement has been published and push notification dispatched.`,
    };
  },
};
