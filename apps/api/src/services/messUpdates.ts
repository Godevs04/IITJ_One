/**
 * Service for managing temporary mess menu updates.
 * Handles lifecycle (create, update, archive, delete) with announcement and push synchronization.
 * Never modifies the master recurring MessMenuDoc.
 */
import type {
  TemporaryMessUpdateDoc,
  TemporaryMessUpdateInput,
} from '@iitj1/types';
import { computeMessUpdateExpiry } from '@iitj1/types';
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
    expiresAt,
    status: 'active',
    createdAt: now,
    createdBy: adminEmail,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const saved = await createTemporaryMessUpdate(docToCreate);

  if (input.createNotice !== false) {
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
  patch: Partial<TemporaryMessUpdateDoc>,
  adminEmail: string,
): Promise<{ ok: boolean; value?: TemporaryMessUpdateDoc }> {
  const existing = await getTemporaryMessUpdateById(id);
  if (!existing) return { ok: false };

  const updated = await updateTemporaryMessUpdate(id, patch, adminEmail);
  if (!updated) return { ok: false };

  if (updated.status === 'active') {
    await syncMessUpdateNoticeAndPush(updated, adminEmail);
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
