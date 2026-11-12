import { istDayBounds } from '@iitj1/types';
import { getAllNotices } from '../../../store';
import { editNotice, publishNotice, removeNotice } from '../../notices';
import type { NoticeDoc } from '../../../types';
import { addDays, formatShortDate, keywords } from '../normalize';
import { ActionError, emptyResolution, str, type ActionContext, type ActionDefinition, type FieldSpec, type Params, type Resolution } from './types';

const CATEGORIES = {
  general: /^(general|all|everyone)$/,
  mess: /^(mess|food|dining)$/,
  transport: /^(transport|bus|buses)$/,
  institute: /^(institute|academic|academics|office)$/,
  orientation: /^(orientation|freshers?)$/,
};

const titleField: FieldSpec = { name: 'title', label: 'Title', describe: 'Short notice title (draft one from the message if not given)', kind: 'text', max: 200, question: 'What should the title of the notice be?' };
const bodyField: FieldSpec = { name: 'body', label: 'Message', describe: 'The notice text students will read', kind: 'text', max: 5000, question: 'What should the notice say?' };
const untilField: FieldSpec = { name: 'until', label: 'Shown until', describe: 'Last day the notice is shown', kind: 'date', question: 'Until which date should the notice be shown?' };
const noticeRef: FieldSpec = { name: 'notice', label: 'Notice', describe: 'Which existing notice (words from its title or text)', kind: 'ref', max: 200, required: true, question: 'Which notice do you mean?' };

/** End of an IST day (the moment the next day starts). */
const endOfDay = (date: string) => istDayBounds(date).end;

function short(text: string, n = 140): string {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}

async function currentNotices(campusId: string, now: Date): Promise<NoticeDoc[]> {
  const { items } = await getAllNotices(campusId, undefined, 1, 200);
  return items.filter((n) => !n.deletedAt && new Date(n.expiryDate) > now);
}

/** Matches a reference ("tomorrow's maintenance", an exact title, or an id from an option) to one current notice. */
async function resolveNotice(p: Params, ctx: ActionContext, r: Resolution): Promise<NoticeDoc | null> {
  const ref = str(p.notice);
  if (!ref) return null;
  const notices = await currentNotices(ctx.campusId, ctx.now);
  const options = (list: NoticeDoc[]) => list.slice(0, 6).map((n) => ({ label: n.title, value: String(n._id) }));
  const byId = notices.find((n) => String(n._id) === ref);
  if (byId) {
    r.entities.push({ field: 'notice', kind: 'notice', id: String(byId._id), label: byId.title });
    return byId;
  }
  const words = keywords(ref);
  const scored = notices
    .map((n) => {
      const title = n.title.toLowerCase();
      const body = n.body.toLowerCase();
      const score = words.reduce((s, w) => s + (title.includes(w) ? 2 : 0) + (body.includes(w) ? 1 : 0), 0);
      return { n, score: title === ref.toLowerCase() ? 100 : score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    r.fieldErrors.notice = `I couldn't find a current notice matching “${short(ref, 60)}”.`;
    if (notices.length) r.options.notice = options(notices);
    return null;
  }
  const best = scored.filter((x) => x.score === scored[0].score).map((x) => x.n);
  if (best.length > 1) {
    delete r.params.notice;
    r.questions.notice = `I found ${best.length} matching notices. Which one?`;
    r.options.notice = options(best);
    return null;
  }
  r.entities.push({ field: 'notice', kind: 'notice', id: String(best[0]._id), label: best[0].title });
  r.params.notice = String(best[0]._id);
  return best[0];
}

export const createNotice: ActionDefinition = {
  name: 'create_notice',
  fields: [
    { ...titleField, required: true },
    { ...bodyField, required: true },
    { name: 'category', label: 'Category', describe: 'general | mess | transport | institute | orientation', kind: 'enum', enumValues: CATEGORIES, question: 'Which category is it?' },
    { name: 'important', label: 'Important', describe: 'Mark as important (true/false)', kind: 'boolean', question: 'Should it be marked important?' },
    { name: 'date', label: 'Shows from', describe: 'First day the notice is shown (default today)', kind: 'date', question: 'From which date should it be shown?' },
    untilField,
    { name: 'notification', label: 'Notification', describe: 'Send a push notification (true/false; default false)', kind: 'boolean', question: 'Should I send a notification?' },
  ],
  defaults: (p, ctx) => {
    const date = str(p.date) ?? ctx.today;
    return { category: 'general', important: false, date, until: addDays(date, 7), notification: false };
  },
  resolve: async (p) => emptyResolution(p),
  validate: async (p, _r, ctx) => {
    const issues = [];
    if (p.notification === true) {
      issues.push({ message: "I can't send push notifications from AI Admin yet. Say “without a notification” to post it in the app only, or use the Push page." });
    }
    if (String(p.date) < ctx.today) issues.push({ field: 'date', message: "A notice can't start in the past." });
    if (String(p.until) < String(p.date)) issues.push({ field: 'until', message: 'The end date is before the start date.' });
    return issues;
  },
  preview: async (p, _r, ctx) => ({
    title: 'Post notice',
    rows: [
      { label: 'Title', value: String(p.title) },
      { label: 'Message', value: String(p.body) },
      { label: 'Category', value: String(p.category).replace(/^./, (c) => c.toUpperCase()) },
      { label: 'Audience', value: 'All app users' },
      { label: 'Shown', value: `${p.date === ctx.today ? 'Now' : formatShortDate(String(p.date))} until ${formatShortDate(String(p.until))}` },
      ...(p.important ? [{ label: 'Important', value: 'Yes' }] : []),
    ],
    warnings: [],
    notification: 'No',
  }),
  execute: async (p, _r, ctx) => {
    const start = p.date === ctx.today ? ctx.now : istDayBounds(String(p.date)).start;
    const { value } = await publishNotice(
      {
        campusId: ctx.campusId,
        title: String(p.title),
        body: String(p.body),
        category: String(p.category),
        isImportant: p.important === true,
        startDate: start,
        expiryDate: endOfDay(String(p.until)),
      },
      ctx.admin.email,
    );
    return { summary: `Posted notice “${value.title}”`, message: `Done — the notice “${value.title}” is posted.` };
  },
};

export const updateNotice: ActionDefinition = {
  name: 'update_notice',
  fields: [noticeRef, titleField, bodyField, untilField],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const notice = await resolveNotice(p, ctx, r);
    if (notice) {
      r.data.notice = notice;
      if (p.title === undefined && p.body === undefined && p.until === undefined) {
        r.extraMissing = { field: 'body', question: `What should I change in “${notice.title}”? Give the new text, a new title, or a new end date.` };
      }
    }
    return r;
  },
  validate: async (p, r, ctx) => {
    if (p.until !== undefined && String(p.until) < ctx.today) return [{ field: 'until', message: "The end date can't be in the past." }];
    const n = r.data.notice as NoticeDoc;
    if ((p.title ?? n.title) === n.title && (p.body ?? n.body) === n.body && p.until === undefined) return [{ message: 'That would not change anything.' }];
    return [];
  },
  preview: async (p, r) => {
    const n = r.data.notice as NoticeDoc;
    const rows = [];
    if (p.title !== undefined) rows.push({ label: 'Title', before: n.title, value: String(p.title) });
    else rows.push({ label: 'Notice', value: n.title });
    if (p.body !== undefined) rows.push({ label: 'Message', before: short(n.body), value: String(p.body) });
    if (p.until !== undefined) rows.push({ label: 'Shown until', before: formatShortDate(new Date(n.expiryDate).toISOString().slice(0, 10)), value: formatShortDate(String(p.until)) });
    return { title: 'Edit notice', rows, warnings: [], notification: 'No' };
  },
  execute: async (p, r, ctx) => {
    const n = r.data.notice as NoticeDoc;
    const patch: Partial<NoticeDoc> = {};
    if (p.title !== undefined) patch.title = String(p.title);
    if (p.body !== undefined) patch.body = String(p.body);
    if (p.until !== undefined) patch.expiryDate = endOfDay(String(p.until));
    const { value } = await editNotice(String(n._id), patch, ctx.admin.email);
    if (!value) throw new ActionError('That notice no longer exists.');
    return { summary: `Edited notice “${value.title}”`, message: `Done — “${value.title}” is updated.` };
  },
};

export const deleteNotice: ActionDefinition = {
  name: 'delete_notice',
  fields: [noticeRef],
  resolve: async (p, ctx) => {
    const r = emptyResolution(p);
    const notice = await resolveNotice(p, ctx, r);
    if (notice) r.data.notice = notice;
    return r;
  },
  validate: async () => [],
  preview: async (_p, r) => {
    const n = r.data.notice as NoticeDoc;
    return {
      title: 'Delete notice',
      subtitle: n.title,
      rows: [
        { label: 'Message', value: short(n.body) },
        { label: 'Posted', value: formatShortDate(new Date(n.publishedAt ?? n.startDate).toISOString().slice(0, 10)) },
      ],
      warnings: ['Students will no longer see this notice.'],
      notification: 'No',
    };
  },
  execute: async (_p, r, ctx) => {
    const n = r.data.notice as NoticeDoc;
    const { value: ok } = await removeNotice(String(n._id), ctx.admin.email);
    if (!ok) throw new ActionError('That notice no longer exists.');
    return { summary: `Deleted notice “${n.title}”`, message: `Done — “${n.title}” is deleted.` };
  },
};
