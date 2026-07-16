import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { pushBodySchema, pushHistoryQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { sendTopicPush, resolveTopic } from '../../services/fcm';
import { bumpVersion, addPushHistory, getPushHistory, getPushHistoryById } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import { isStrictObjectId } from '../../utils/objectId';
import type { PushHistoryDoc } from '../../types';

const router = Router();

async function dispatchAndRecord(
  topic: string,
  title: string,
  body: string,
  data: Record<string, string> | undefined,
  imageUrl: string | undefined,
  sentBy: string,
  retryOf?: string,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const resolvedTopic = resolveTopic(topic);
  const result = await sendTopicPush(resolvedTopic, title, body, data, imageUrl);

  const historyEntry: Omit<PushHistoryDoc, '_id'> = {
    title,
    body,
    topic: resolvedTopic,
    data,
    imageUrl,
    sentBy,
    sentAt: new Date(),
    successCount: result.successCount,
    failureCount: result.failureCount,
    firebaseMessageIds: result.firebaseMessageIds,
    errors: result.errors,
    configured: result.configured,
    ...(retryOf ? { retryOf } : {}),
  };
  const saved = await addPushHistory(historyEntry);

  if (!result.configured) {
    return { status: 503, payload: { error: result.errors[0] ?? 'FCM is not configured', history: saved } };
  }
  if (!result.success) {
    return { status: 502, payload: { error: result.errors[0] ?? 'Push failed', history: saved } };
  }

  await bumpVersion('notices', 'iitj', sentBy, 'push', `Push to ${resolvedTopic}: ${title}`);
  return {
    status: 200,
    payload: {
      success: true,
      topic: resolvedTopic,
      recipientCount: result.recipientCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      firebaseMessageIds: result.firebaseMessageIds,
      history: saved,
    },
  };
}

router.post('/', validateBody(pushBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { topic, title, body, data, imageUrl } = req.body as {
    topic: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  };
  const { status, payload } = await dispatchAndRecord(topic, title, body, data, imageUrl, req.admin!.email);
  res.status(status).json(payload);
}));

router.get('/history', validateQuery(pushHistoryQuerySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, topic, search, sort } = (
    req as typeof req & {
      validatedQuery: { page: number; limit: number; topic?: string; search?: string; sort: 'asc' | 'desc' };
    }
  ).validatedQuery;
  const { items, total } = await getPushHistory(page, limit, { topic, search }, sort);
  res.json({ history: items, total, page, pageSize: limit });
}));

router.post('/retry/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid push history id' });
    return;
  }
  const original = await getPushHistoryById(id);
  if (!original) {
    res.status(404).json({ error: 'Push history entry not found' });
    return;
  }
  const { status, payload } = await dispatchAndRecord(
    original.topic,
    original.title,
    original.body,
    original.data,
    original.imageUrl,
    req.admin!.email,
    id,
  );
  res.status(status).json(payload);
}));

export default router;
