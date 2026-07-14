import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { noticeCreateSchema, noticePatchSchema, noticesQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { createNotice, updateNotice, deleteNotice, restoreNotice, getAllNotices } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import type { NoticeDoc } from '../../types';

const router = Router();

function assertNoticeId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    // Fallback ids look like "fallback-1"
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid notice id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid notice id' });
    return false;
  }
  return true;
}

router.get('/', validateQuery(noticesQuerySchema), async (req, res: Response) => {
  const { campus, category } = (
    req as typeof req & { validatedQuery: { campus: string; category?: string } }
  ).validatedQuery;
  const notices = await getAllNotices(campus, category);
  res.json({ campusId: campus, notices });
});

router.post('/', validateBody(noticeCreateSchema), async (req: AuthRequest, res: Response) => {
  const body = req.body as Omit<NoticeDoc, 'publishedAt'>;
  const notice: NoticeDoc = {
    ...body,
    startDate: new Date(body.startDate),
    expiryDate: new Date(body.expiryDate),
    publishedAt: new Date(),
    link: body.link || undefined,
    imageUrl: body.imageUrl || undefined,
  };
  const saved = await createNotice(notice, req.admin!.email);
  res.status(201).json(saved);
});

router.patch('/:id', validateBody(noticePatchSchema), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  if (!assertNoticeId(id, res)) return;

  const patch = { ...req.body } as Partial<NoticeDoc>;
  if (patch.startDate) patch.startDate = new Date(patch.startDate as unknown as string);
  if (patch.expiryDate) patch.expiryDate = new Date(patch.expiryDate as unknown as string);
  const saved = await updateNotice(id, patch, req.admin!.email);
  if (!saved) {
    res.status(404).json({ error: 'Notice not found' });
    return;
  }
  res.json(saved);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  if (!assertNoticeId(id, res)) return;

  const ok = await deleteNotice(id, req.admin!.email);
  if (!ok) {
    res.status(404).json({ error: 'Notice not found' });
    return;
  }
  res.json({ success: true });
});

router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  if (!assertNoticeId(id, res)) return;

  const saved = await restoreNotice(id, req.admin!.email);
  if (!saved) {
    res.status(404).json({ error: 'Notice not found or not deleted' });
    return;
  }
  res.json(saved);
});

export default router;
