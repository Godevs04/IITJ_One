import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { noticeCreateSchema, noticePatchSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { createNotice, updateNotice, deleteNotice } from '../../store';
import type { NoticeDoc } from '../../types';

const router = Router();

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
  const patch = { ...req.body } as Partial<NoticeDoc>;
  if (patch.startDate) patch.startDate = new Date(patch.startDate as unknown as string);
  if (patch.expiryDate) patch.expiryDate = new Date(patch.expiryDate as unknown as string);
  const id = String(req.params.id);
  const saved = await updateNotice(id, patch, req.admin!.email);
  if (!saved) {
    res.status(404).json({ error: 'Notice not found' });
    return;
  }
  res.json(saved);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const ok = await deleteNotice(String(req.params.id), req.admin!.email);
  if (!ok) {
    res.status(404).json({ error: 'Notice not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
