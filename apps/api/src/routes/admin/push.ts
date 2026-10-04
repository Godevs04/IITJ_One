import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { pushBodySchema, pushHistoryQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { dispatchTopicPush, topicPushHttpResponse } from '../../services/push';
import { getPushHistory, getPushHistoryById } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import { isStrictObjectId } from '../../utils/objectId';

const router = Router();

router.post('/', validateBody(pushBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { topic, title, body, data, imageUrl } = req.body as {
    topic: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  };
  const { status, payload } = topicPushHttpResponse(
    await dispatchTopicPush({ topic, title, body, data, imageUrl }, req.admin!.email),
  );
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
  const { status, payload } = topicPushHttpResponse(
    await dispatchTopicPush(
      { topic: original.topic, title: original.title, body: original.body, data: original.data, imageUrl: original.imageUrl },
      req.admin!.email,
      id,
    ),
  );
  res.status(status).json(payload);
}));

export default router;
