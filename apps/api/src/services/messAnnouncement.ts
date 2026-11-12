/**
 * Announcement generator and notification synchronizer for Temporary Mess Updates.
 *
 * Dynamically constructs notice titles, bodies, and push notifications for:
 * - Item substitutions (e.g. Aloo instead of Paneer)
 * - Item unavailabilities (e.g. Paneer unavailable)
 * - Special menus (e.g. Special Dinner)
 * - Meal timing changes (e.g. Breakfast timing shifted)
 *
 * Automatically links to the student-facing Mess Menu screen (`/(tabs)/menu`)
 * and ensures duplicate prevention across republishes.
 */
import type { TemporaryMessUpdateDoc } from '@iitj1/types';
import { getIstDateString } from '../utils/istTime';
import { publishNotice, editNotice, removeNotice } from './notices';
import { dispatchTopicPush } from './push';
import {
  getNoticeByMessUpdateId,
  updateTemporaryMessUpdate,
  restoreNotice,
} from '../store';


const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function formatDayAndDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAY_NAMES[dt.getUTCDay()];
  const month = MONTH_NAMES[dt.getUTCMonth()];
  return `${weekday} ${d} ${month}`;
}

function nextDayKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function cleanReason(reason?: string | null): string | null {
  if (!reason) return null;
  const trimmed = reason.trim().replace(/[.!?]+$/, '');
  if (!trimmed) return null;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

export interface MessAnnouncement {
  title: string;
  noticeBody: string;
  pushTitle: string;
  pushBody: string;
  category: 'mess';
  isImportant: boolean;
}

export function buildMessAnnouncement(update: TemporaryMessUpdateDoc, todayKey?: string): MessAnnouncement {
  const today = todayKey ?? getIstDateString();
  const tomorrow = nextDayKey(today);
  const date = update.date;
  const formattedDate = formatDayAndDate(date);
  const mealName = capitalize(update.meal);

  let dateNoticeClause: string;
  let datePushClause: string;
  let dateWord: string;

  if (date === today) {
    dateNoticeClause = `today, ${formattedDate}`;
    datePushClause = 'today';
    dateWord = 'Today';
  } else if (date === tomorrow) {
    dateNoticeClause = `tomorrow, ${formattedDate}`;
    datePushClause = 'tomorrow';
    dateWord = 'Tomorrow';
  } else {
    dateNoticeClause = `on ${formattedDate}`;
    datePushClause = `on ${formattedDate}`;
    dateWord = formattedDate;
  }

  const reason = cleanReason(update.reason);
  const reasonSentence = reason ? ` Reason: ${reason}.` : '';

  switch (update.updateType) {
    case 'item_substitution': {
      const original = update.originalItem || 'scheduled dish';
      const replacement = update.replacementItem || 'alternative dish';
      return {
        title: `${dateWord} ${mealName} Menu Update`,
        noticeBody: `For ${mealName} ${dateNoticeClause}: ${replacement} will be served in place of ${original}.${reasonSentence} All other ${update.meal} items will be served as scheduled.`,
        pushTitle: `${mealName} Menu Update`,
        pushBody: `${replacement} will be served instead of ${original} for ${update.meal} ${datePushClause}.`,
        category: 'mess',
        isImportant: true,
      };
    }

    case 'item_unavailable': {
      const original = update.originalItem || 'scheduled dish';
      return {
        title: `${dateWord} ${mealName} Notice: ${original} Unavailable`,
        noticeBody: `For ${mealName} ${dateNoticeClause}: ${original} is currently unavailable and will not be served.${reasonSentence} All other scheduled items remain available.`,
        pushTitle: `${original} Unavailable for ${mealName}`,
        pushBody: `${original} will not be served for ${update.meal} ${datePushClause}.${reason ? ` Reason: ${reason}.` : ''}`,
        category: 'mess',
        isImportant: true,
      };
    }

    case 'special_menu': {
      const specials = update.specialItems && update.specialItems.length > 0 ? update.specialItems.join(', ') : 'special festive dishes';
      return {
        title: `Special ${mealName} ${dateWord}`,
        noticeBody: `A special ${update.meal} will be served ${dateNoticeClause}, featuring ${specials}.${reasonSentence} Enjoy your meal!`,
        pushTitle: `Special ${mealName} ${dateWord}`,
        pushBody: `Special ${update.meal} will be served ${datePushClause}, featuring ${specials}.`,
        category: 'mess',
        isImportant: true,
      };
    }

    case 'timing_change': {
      const timingLabel = update.newTiming?.label || (update.newTiming?.start && update.newTiming?.end ? `${update.newTiming.start} – ${update.newTiming.end}` : 'adjusted hours');
      return {
        title: `${mealName} Timing Changed ${dateWord}`,
        noticeBody: `${mealName} timing ${dateNoticeClause} has been updated to ${timingLabel}.${reasonSentence} Please plan your meal accordingly.`,
        pushTitle: `${mealName} Timing Changed`,
        pushBody: `${mealName} timing ${datePushClause} is updated to ${timingLabel}.${reason ? ` Reason: ${reason}.` : ''}`,
        category: 'mess',
        isImportant: true,
      };
    }

    case 'general_update':
    default: {
      const replacement = update.replacementItem || 'menu update';
      return {
        title: `${dateWord} ${mealName} Update`,
        noticeBody: `Notice regarding ${update.meal} ${dateNoticeClause}: ${replacement}.${reasonSentence}`,
        pushTitle: `${mealName} Update`,
        pushBody: `Update for ${update.meal} ${datePushClause}: ${replacement}.`,
        category: 'mess',
        isImportant: true,
      };
    }
  }
}

/**
 * Synchronizes a temporary mess update to the campus notices feed and push notification topic.
 * Safe to call repeatedly: updates existing notice in-place and prevents duplicate push notifications.
 */
export async function syncMessUpdateNoticeAndPush(
  update: TemporaryMessUpdateDoc,
  adminEmail: string,
): Promise<{ noticeId?: string; pushSent: boolean }> {
  const ann = buildMessAnnouncement(update);
  const now = new Date();
  const expiryDate = new Date(update.expiresAt);

  const metadata = {
    type: 'temporary_mess_update',
    messUpdateId: update._id,
    date: update.date,
    meal: update.meal,
    diet: update.diet,
    updateType: update.updateType,
    originalItem: update.originalItem,
    replacementItem: update.replacementItem,
    specialItems: update.specialItems,
    newTiming: update.newTiming?.label || (update.newTiming?.start ? `${update.newTiming.start} – ${update.newTiming.end}` : undefined),
    reason: cleanReason(update.reason),
  };

  const existingNotice = await getNoticeByMessUpdateId(update._id);
  let noticeId: string | undefined = existingNotice?._id ? String(existingNotice._id) : undefined;

  if (update.createNotice !== false && existingNotice && existingNotice._id) {
    if (existingNotice.deletedAt) await restoreNotice(String(existingNotice._id), adminEmail);
    // Update existing notice in-place
    await editNotice(
      String(existingNotice._id),
      {
        title: ann.title,
        body: ann.noticeBody,
        category: ann.category,
        link: '/(tabs)/menu',
        isImportant: ann.isImportant,
        startDate: now,
        expiryDate: expiryDate,
        metadata,
      },
      adminEmail,
    );
  } else if (update.createNotice !== false) {
    // Create new campus notice
    const { value: created } = await publishNotice(
      {
        campusId: update.campusId,
        title: ann.title,
        body: ann.noticeBody,
        category: ann.category,
        link: '/(tabs)/menu',
        isImportant: ann.isImportant,
        startDate: now,
        expiryDate: expiryDate,
        metadata,
      },
      adminEmail,
    );
    noticeId = created._id ? String(created._id) : undefined;
  }

  // Push notification with duplicate protection
  let pushSent = Boolean(update.pushSent);
  if (!update.pushSent && update.sendPush !== false) {
    const delivery = await dispatchTopicPush(
      {
        topic: 'iitj_mess',
        title: ann.pushTitle,
        body: ann.pushBody,
        data: {
          type: 'temporary_mess_update',
          messUpdateId: update._id,
          meal: update.meal,
          date: update.date,
          link: '/(tabs)/menu',
        },
      },
      adminEmail,
    );
    pushSent = delivery.outcome === 'sent';
  }


  // Update mess update document with noticeId and push status
  await updateTemporaryMessUpdate(
    update._id,
    {
      noticeId,
      pushSent,
      pushSentAt: pushSent && !update.pushSent ? new Date().toISOString() : update.pushSentAt,
    },
    adminEmail,
  );

  return { noticeId, pushSent };
}

/**
 * When a temporary mess update is archived or cancelled, this withdraws the linked campus notice.
 */
export async function withdrawLinkedMessNotice(messUpdateId: string, adminEmail: string): Promise<void> {
  const existing = await getNoticeByMessUpdateId(messUpdateId);
  if (existing && existing._id) {
    await removeNotice(String(existing._id), adminEmail);
  }
}
