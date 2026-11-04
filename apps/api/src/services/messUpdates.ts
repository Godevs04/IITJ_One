/**
 * Service for managing temporary mess menu updates.
 * Handles lifecycle (create, update, archive, delete) with announcement and push synchronization.
 * Never modifies the master recurring MessMenuDoc.
 */
import type {
  TemporaryMessUpdateDoc,
  TemporaryMessUpdateInput,
  TemporaryMessUpdatePatch,
} from '@iitj1/types';
import { computeMessUpdateExpiry, temporaryMessUpdateCreateSchema } from '@iitj1/types';
import {
  createTemporaryMessUpdate,
  getTemporaryMessUpdateById,
  updateTemporaryMessUpdate,
  archiveTemporaryMessUpdate,
  deleteTemporaryMessUpdate,
  logAudit,
} from '../store';
import {
  syncMessUpdateNoticeAndPush,
  withdrawLinkedMessNotice,
} from './messAnnouncement';

export async function createTemporaryMessUpdateService(
  input: TemporaryMessUpdateInput,
  adminEmail: string,
): Promise<{ value: TemporaryMessUpdateDoc }> {
  const now = new Date().toISOString();
  const expiresAt = input.expiresAt || computeMessUpdateExpiry(input.date, input.meal);

  const docToCreate: TemporaryMessUpdateDoc = {
    _id: '',
    campusId: input.campusId,
    date: input.date,
    meal: input.meal,
    diet: input.diet || 'both',
    updateType: input.updateType,
    originalItem: input.originalItem,
    replacementItem: input.replacementItem,
    specialItems: input.specialItems,
    newTiming: input.newTiming,
    reason: input.reason,
    sendPush: input.sendPush !== false,
    createNotice: input.createNotice !== false,
    expiresAt,
    status: 'active',
    createdAt: now,
    createdBy: adminEmail,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const saved = await createTemporaryMessUpdate(docToCreate);

  if (input.createNotice !== false || input.sendPush !== false) {
    const { noticeId, pushSent } = await syncMessUpdateNoticeAndPush(saved, adminEmail);
    saved.noticeId = noticeId;
    saved.pushSent = pushSent;
  }

  await logAudit(
    adminEmail,
    'mess_update_created',
    `Created temporary mess update for ${saved.meal} on ${saved.date}: ${saved.updateType}`,
  );

  return { value: saved };
}

export async function updateTemporaryMessUpdateService(
  id: string,
  patch: TemporaryMessUpdatePatch,
  adminEmail: string,
): Promise<{ ok: boolean; value?: TemporaryMessUpdateDoc; errors?: string[] }> {
  const existing = await getTemporaryMessUpdateById(id);
  if (!existing) return { ok: false };

  const parsed = temporaryMessUpdateCreateSchema.safeParse({
    ...existing,
    ...patch,
    expiresAt: patch.expiresAt ?? (patch.date !== undefined || patch.meal !== undefined
      ? computeMessUpdateExpiry(patch.date ?? existing.date, patch.meal ?? existing.meal)
      : existing.expiresAt),
  });
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
  const { campusId: _campusId, ...validatedPatch } = parsed.data;
  const updated = await updateTemporaryMessUpdate(id, validatedPatch, adminEmail);
  if (!updated) return { ok: false };

  if (updated.status === 'active') {
    if (updated.createNotice === false) await withdrawLinkedMessNotice(id, adminEmail);
    const communication = await syncMessUpdateNoticeAndPush(updated, adminEmail);
    updated.noticeId = communication.noticeId;
    updated.pushSent = communication.pushSent;
  } else {
    await withdrawLinkedMessNotice(id, adminEmail);
  }

  await logAudit(
    adminEmail,
    'mess_update_updated',
    `Updated temporary mess update ${id} for ${updated.meal} on ${updated.date}`,
  );

  return { ok: true, value: updated };
}

export async function archiveTemporaryMessUpdateService(
  id: string,
  adminEmail: string,
): Promise<{ ok: boolean }> {
  const existing = await getTemporaryMessUpdateById(id);
  if (!existing) return { ok: false };

  await withdrawLinkedMessNotice(id, adminEmail);
  const ok = await archiveTemporaryMessUpdate(id, adminEmail);

  await logAudit(
    adminEmail,
    'mess_update_archived',
    `Archived temporary mess update ${id} for ${existing.meal} on ${existing.date}`,
  );

  return { ok };
}

export async function deleteTemporaryMessUpdateService(
  id: string,
  adminEmail: string,
): Promise<{ ok: boolean }> {
  const existing = await getTemporaryMessUpdateById(id);
  if (!existing) return { ok: false };

  await withdrawLinkedMessNotice(id, adminEmail);
  const ok = await deleteTemporaryMessUpdate(id);

  await logAudit(
    adminEmail,
    'mess_update_deleted',
    `Deleted temporary mess update ${id} for ${existing.meal} on ${existing.date}`,
  );

  return { ok };
}
