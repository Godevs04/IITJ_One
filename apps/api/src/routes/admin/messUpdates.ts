import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { adminMessUpdatesQuerySchema } from '../../models/schemas';
import { temporaryMessUpdateCreateSchema, type TemporaryMessUpdateInput, type TemporaryMessUpdateDoc } from '@iitj1/types';
import { AuthRequest } from '../../middleware/auth';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { getTemporaryMessUpdateById, getTemporaryMessUpdatesForDate } from '../../store';
import {
  createTemporaryMessUpdateService,
  updateTemporaryMessUpdateService,
  archiveTemporaryMessUpdateService,
  deleteTemporaryMessUpdateService,
} from '../../services/messUpdates';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getIstDateString } from '../../utils/istTime';

const router = Router();

function assertMessUpdateId(id: string, res: Response): boolean {
  const valid = isDbConnected() ? isStrictObjectId(id) : id.trim().length > 0;
  if (!valid) res.status(400).json({ error: 'Invalid mess update id' });
  return valid;
}

router.get(
  '/',
  validateQuery(adminMessUpdatesQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, date, status, meal } = (
      req as typeof req & {
        validatedQuery: { campus: string; date?: string; status?: 'active' | 'archived'; meal?: string };
      }
    ).validatedQuery;
    const targetDate = date || getIstDateString();
    let updates = await getTemporaryMessUpdatesForDate(campus, targetDate);

    if (status) {
      updates = updates.filter((u) => u.status === status);
    }
    if (meal) {
      updates = updates.filter((u) => u.meal === meal);
    }

    res.json({ campusId: campus, date: targetDate, updates });
  }),
);

router.post(
  '/',
  validateBody(temporaryMessUpdateCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = req.body as TemporaryMessUpdateInput;
    const { value: created } = await createTemporaryMessUpdateService(input, req.admin!.email);
    res.status(201).json(created);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertMessUpdateId(id, res)) return;

    const doc = await getTemporaryMessUpdateById(id);
    if (!doc) {
      res.status(404).json({ error: 'Mess update not found' });
      return;
    }
    res.json(doc);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertMessUpdateId(id, res)) return;

    const patch = req.body as Partial<TemporaryMessUpdateDoc>;
    const { ok, value } = await updateTemporaryMessUpdateService(id, patch, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Mess update not found' });
      return;
    }
    res.json(value);
  }),
);

router.post(
  '/:id/archive',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertMessUpdateId(id, res)) return;

    const { ok } = await archiveTemporaryMessUpdateService(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Mess update not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertMessUpdateId(id, res)) return;

    const { ok } = await deleteTemporaryMessUpdateService(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Mess update not found' });
      return;
    }
    res.json({ success: true });
  }),
);

export default router;
