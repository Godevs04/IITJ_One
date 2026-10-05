import type { Holiday } from '@iitj1/types';
import { getCalendar, getHolidays } from '../../../store';
import { deleteHoliday, previewHolidayTransport, setHolidayActive, upsertHoliday, type HolidayTransportPreview } from '../../holidays';
import { formatLongDate, formatShortDate, keywords, normalizeDate } from '../normalize';
import { ActionError, emptyResolution, str, type ActionContext, type ActionDefinition, type Params, type Resolution } from './types';

const TIMETABLE = { 'mon-sat': 'Mon–Sat', 'sun-holiday': 'Sunday & Holidays' } as const;

function busesRow(t: HolidayTransportPreview): { label: string; value: string } {
  return {
    label: 'Buses that day',
    value: t.changesTimetable
      ? `${TIMETABLE[t.after]} timetable (instead of ${TIMETABLE[t.before]})`
      : `${TIMETABLE[t.after]} timetable — no change`,
  };
}

function transportWarnings(t: HolidayTransportPreview): string[] {
  return t.overriddenByException ? [`A special schedule (“${t.overriddenByException.title}”) already covers that day and still applies.`] : [];
}

/** "Dussehra" → the academic calendar's next holiday whose name contains it. */
async function calendarDate(name: string, ctx: ActionContext): Promise<{ date: string; title: string } | null> {
  const cal = await getCalendar(ctx.campusId);
  const words = keywords(name);
  if (!words.length) return null;
  const events = ((cal as unknown as { events?: { title: string; startDate: string; type?: string; category?: string }[] })?.events ?? [])
    .filter((e) => (e.type === 'holiday' || e.category === 'holiday') && e.startDate >= ctx.today)
    .filter((e) => words.every((w) => e.title.toLowerCase().includes(w)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return events[0] ? { date: events[0].startDate, title: events[0].title } : null;
}

async function resolveHoliday(p: Params, ctx: ActionContext, r: Resolution): Promise<Holiday | null> {
  const ref = str(p.holiday);
  const holidays = (await getHolidays(ctx.campusId))?.holidays ?? [];
  const opts = (list: Holiday[]) =>
    list
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((h) => h.date >= ctx.today)
      .slice(0, 6)
      .map((h) => ({ label: `${h.name} · ${formatShortDate(h.date)}${h.isActive ? '' : ' (off)'}`, value: h.id }));
  if (!ref) {
    r.options.holiday = opts(holidays);
    return null;
  }
  const asDate = normalizeDate(ref, ctx.today);
  const words = keywords(ref);
  const matches = holidays.filter(
    (h) => h.id === ref || (asDate.ok && h.date === asDate.value) || (words.length > 0 && words.every((w) => h.name.toLowerCase().includes(w))),
  );
  // Prefer upcoming ones when a name repeats across years.
  const upcoming = matches.filter((h) => h.date >= ctx.today);
  const list = upcoming.length ? upcoming : matches;
  if (list.length === 1) {
    r.params.holiday = list[0].id;
    r.entities.push({ field: 'holiday', kind: 'holiday', id: list[0].id, label: `${list[0].name} (${formatShortDate(list[0].date)})` });
    return list[0];
  }
  if (list.length > 1) {
    delete r.params.holiday;
    r.questions.holiday = 'More than one holiday matches. Which one?';
    r.options.holiday = opts(list);
  } else {
    r.fieldErrors.holiday = `I couldn't find a holiday matching “${ref.slice(0, 60)}”.`;
    r.options.holiday = opts(holidays);
  }
  return null;
}

const holidayRef = { name: 'holiday', label: 'Holiday', describe: 'Which existing holiday (its name or date)', kind: 'ref' as const, max: 200, required: true, question: 'Which holiday do you mean?' };

export const createHolidayAction: ActionDefinition = {
  name: 'create_holiday',
  fields: [
    { name: 'name', label: 'Name', describe: 'Holiday name', kind: 'text', max: 200, required: true, question: 'What is the holiday called?' },
    { name: 'date', label: 'Date', describe: 'Holiday date (leave empty if not stated — the backend checks the academic calendar)', kind: 'date', required: true, question: 'Which date is the holiday?' },
    { name: 'description', label: 'Description', describe: 'Optional note', kind: 'text', max: 500, question: 'Any description?' },
  ],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const name = str(p.name);
    if (name && !p.date) {
      const found = await calendarDate(name, ctx);
      if (found) {
        r.params.date = found.date;
        r.data.fromCalendar = found.title;
        r.entities.push({ field: 'date', kind: 'calendar_event', id: found.date, label: `${found.title} — ${formatShortDate(found.date)}`, source: 'Academic calendar' });
      } else {
        r.questions.date = `Which date is ${name}? I couldn't find it in the academic calendar.`;
      }
    }
    return r;
  },
  validate: async (p, _r, ctx) => {
    if (String(p.date) < ctx.today) return [{ field: 'date', message: 'That date has already passed.' }];
    const clash = ((await getHolidays(ctx.campusId))?.holidays ?? []).find((h) => h.isActive && h.date === p.date);
    if (clash) return [{ field: 'date', message: `“${clash.name}” is already a holiday on ${formatShortDate(String(p.date))}.` }];
    return [];
  },
  preview: async (p, r, ctx) => {
    const t = await previewHolidayTransport(ctx.campusId, String(p.date), { setActive: true });
    return {
      title: 'Add holiday',
      subtitle: `${p.name} · ${formatLongDate(String(p.date))}`,
      rows: [
        { label: 'Name', value: String(p.name) },
        { label: 'Date', value: formatLongDate(String(p.date)) + (r.data.fromCalendar ? ' (from the academic calendar)' : '') },
        busesRow(t),
        ...(p.description ? [{ label: 'Description', value: String(p.description) }] : []),
      ],
      warnings: transportWarnings(t),
      notification: 'No',
    };
  },
  execute: async (p, _r, ctx) => {
    const { value } = await upsertHoliday(ctx.campusId, { name: String(p.name), date: String(p.date), description: str(p.description) }, ctx.admin.email);
    if (!value.ok) throw new ActionError(value.reason === 'invalid' ? value.errors.join(' ') : 'Holiday not found.');
    return { summary: `Added holiday ${p.name} (${formatShortDate(String(p.date))})`, message: `Done — ${p.name} on ${formatShortDate(String(p.date))} is a holiday.` };
  },
};

export const updateHolidayAction: ActionDefinition = {
  name: 'update_holiday',
  fields: [
    holidayRef,
    { name: 'name', label: 'New name', describe: 'New name', kind: 'text', max: 200, question: 'What should it be called?' },
    { name: 'date', label: 'New date', describe: 'New date', kind: 'date', question: 'What is the new date?' },
    { name: 'active', label: 'Active', describe: 'Turn the holiday on (true) or off (false)', kind: 'boolean', question: 'Should it be on or off?' },
  ],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const h = await resolveHoliday(p, ctx, r);
    if (h) {
      r.data.holiday = h;
      if (p.name === undefined && p.date === undefined && p.active === undefined) {
        r.extraMissing = { field: 'date', question: `What should I change for ${h.name} — move it to another date, rename it, or turn it off?` };
      }
    }
    return r;
  },
  validate: async (p, r, ctx) => {
    const h = r.data.holiday as Holiday;
    if (p.date !== undefined && String(p.date) < ctx.today) return [{ field: 'date', message: 'That date has already passed.' }];
    const nextActive = p.active === undefined ? h.isActive : p.active === true;
    const nextDate = str(p.date) ?? h.date;
    if (nextDate === h.date && (str(p.name) ?? h.name) === h.name && nextActive === h.isActive) return [{ message: 'That would not change anything.' }];
    const clash = ((await getHolidays(ctx.campusId))?.holidays ?? []).find((x) => x.id !== h.id && x.isActive && x.date === nextDate);
    if (nextActive && clash) return [{ field: 'date', message: `“${clash.name}” is already a holiday on ${formatShortDate(nextDate)}.` }];
    return [];
  },
  preview: async (p, r, ctx) => {
    const h = r.data.holiday as Holiday;
    const rows: { label: string; value: string; before?: string }[] = [{ label: 'Holiday', value: `${h.name} · ${formatShortDate(h.date)}` }];
    if (p.name !== undefined) rows.push({ label: 'Name', before: h.name, value: String(p.name) });
    if (p.date !== undefined) rows.push({ label: 'Date', before: formatShortDate(h.date), value: formatShortDate(String(p.date)) });
    if (p.active !== undefined) rows.push({ label: 'Status', before: h.isActive ? 'On' : 'Off', value: p.active ? 'On' : 'Off' });
    const warnings: string[] = [];
    if (p.date !== undefined || p.active !== undefined) {
      const nextActive = p.active === undefined ? h.isActive : p.active === true;
      const target = str(p.date) ?? h.date;
      const t = await previewHolidayTransport(ctx.campusId, target, { setActive: nextActive });
      rows.push({ ...busesRow(t), label: `Buses on ${formatShortDate(target)}` });
      if (p.date !== undefined && h.isActive) rows.push({ label: `Buses on ${formatShortDate(h.date)}`, value: 'Back to the normal timetable' });
      warnings.push(...transportWarnings(t));
    }
    return { title: 'Edit holiday', rows, warnings, notification: 'No' };
  },
  execute: async (p, r, ctx) => {
    const h = r.data.holiday as Holiday;
    const { value } =
      p.name === undefined && p.date === undefined
        ? await setHolidayActive(ctx.campusId, h.id, p.active === true, ctx.admin.email)
        : await upsertHoliday(
            ctx.campusId,
            { id: h.id, name: str(p.name) ?? h.name, date: str(p.date) ?? h.date, description: h.description, isActive: p.active === undefined ? h.isActive : p.active === true },
            ctx.admin.email,
          );
    if (!value.ok) throw new ActionError(value.reason === 'invalid' ? value.errors.join(' ') : 'That holiday no longer exists.');
    return { summary: `Edited holiday ${h.name}`, message: `Done — ${h.name} is updated.` };
  },
};

export const removeHolidayAction: ActionDefinition = {
  name: 'remove_holiday',
  fields: [holidayRef],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const h = await resolveHoliday(p, ctx, r);
    if (h) r.data.holiday = h;
    return r;
  },
  validate: async () => [],
  preview: async (_p, r, ctx) => {
    const h = r.data.holiday as Holiday;
    const t = await previewHolidayTransport(ctx.campusId, h.date, { setActive: false });
    return {
      title: 'Remove holiday',
      subtitle: `${h.name} · ${formatLongDate(h.date)}`,
      rows: [{ ...busesRow(t), label: 'Buses that day' }],
      warnings: ['The holiday disappears from the app.', ...transportWarnings(t)],
      notification: 'No',
    };
  },
  execute: async (_p, r, ctx) => {
    const h = r.data.holiday as Holiday;
    const { value } = await deleteHoliday(ctx.campusId, h.id, ctx.admin.email);
    if (!value.ok) throw new ActionError('That holiday no longer exists.');
    return { summary: `Removed holiday ${h.name} (${formatShortDate(h.date)})`, message: `Done — ${h.name} is removed.` };
  },
};
