import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { pushBodySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { sendTopicPush, resolveTopic } from '../../services/fcm';
import { bumpVersion } from '../../store';

const router = Router();

router.post('/', validateBody(pushBodySchema), async (req: AuthRequest, res: Response) => {
  const { topic, title, body, data } = req.body as {
    topic: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };
  const resolvedTopic = resolveTopic(topic);
  const result = await sendTopicPush(resolvedTopic, title, body, data);

  if (!result.success) {
    res.status(502).json({ error: result.error ?? 'Push failed' });
    return;
  }

  await bumpVersion('notices', 'iitj', req.admin!.email, 'push', `Push to ${resolvedTopic}: ${title}`);
  res.json({ success: true, messageId: result.messageId, topic: resolvedTopic });
});

export default router;
