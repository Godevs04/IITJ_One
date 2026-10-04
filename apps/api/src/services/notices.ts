/**
 * Notice preparation and publishing — shared by the admin Notices routes and, later, AI Admin (and other
 * flows that post a notice). Moved unchanged out of routes/admin/notices.ts: same date coercion, same
 * empty link/image clean-up, same store calls (which version-bump and audit-log).
 */
import { createNotice, updateNotice } from '../store';
import type { NoticeDoc } from '../types';

/** Validated create body (noticeCreateSchema) → stored notice: real Dates, publishedAt now, '' link/image dropped. */
export function prepareNotice(body: Omit<NoticeDoc, 'publishedAt'>, now: Date = new Date()): NoticeDoc {
  return {
    ...body,
    startDate: new Date(body.startDate),
    expiryDate: new Date(body.expiryDate),
    publishedAt: now,
    link: body.link || undefined,
    imageUrl: body.imageUrl || undefined,
  };
}

/** Validated patch body (noticePatchSchema) → store patch: date strings become Dates. */
export function prepareNoticePatch(body: Partial<NoticeDoc>): Partial<NoticeDoc> {
  const patch = { ...body };
  if (patch.startDate) patch.startDate = new Date(patch.startDate as unknown as string);
  if (patch.expiryDate) patch.expiryDate = new Date(patch.expiryDate as unknown as string);
  return patch;
}

export async function publishNotice(body: Omit<NoticeDoc, 'publishedAt'>, adminEmail: string): Promise<NoticeDoc> {
  return createNotice(prepareNotice(body), adminEmail);
}

export async function editNotice(id: string, body: Partial<NoticeDoc>, adminEmail: string): Promise<NoticeDoc | null> {
  return updateNotice(id, prepareNoticePatch(body), adminEmail);
}
