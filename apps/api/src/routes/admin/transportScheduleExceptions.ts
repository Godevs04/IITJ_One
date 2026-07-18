import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  transportScheduleExceptionCreateSchema,
  transportScheduleExceptionUpdateSchema,
  adminTransportScheduleExceptionsQuerySchema,
} from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import {
  createTransportScheduleException,
  updateTransportScheduleException,
  deleteTransportScheduleException,
  listTransportScheduleExceptions,
  getTransportScheduleExceptionById,
  publishTransportScheduleException,
  unpublishTransportScheduleException,
  archiveTransportScheduleException,
  listScheduleExceptionRevisions,
  ScheduleExceptionArchivedError,
} from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import type { TransportScheduleExceptionDoc } from '../../types';
import type { TransportScheduleExceptionCreateInput } from '@iitj1/types';
import { computeScheduleStatus } from '../../services/transportScheduleExceptionStatus';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertScheduleExceptionId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid schedule exception id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid schedule exception id' });
    return false;
  }
  return true;
}

function withStatus(doc: TransportScheduleExceptionDoc) {
  return { ...doc, status: computeScheduleStatus(doc) };
}

router.get(
  '/',
  validateQuery(adminTransportScheduleExceptionsQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, lifecycleState, page, limit } = (
      req as typeof req & {
        validatedQuery: { campus: string; lifecycleState?: 'draft' | 'published' | 'archived'; page: number; limit: number };
      }
    ).validatedQuery;
    const { items, total } = await listTransportScheduleExceptions(campus, lifecycleState, page, limit);
    res.json({ campusId: campus, schedules: items.map(withStatus), total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(transportScheduleExceptionCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as TransportScheduleExceptionCreateInput;
    const input = {
      ...body,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveUntil: new Date(body.effectiveUntil),
    };
    const saved = await createTransportScheduleException(input, req.admin!.email);
    res.status(201).json(withStatus(saved));
  }),
);

router.put(
  '/:id',
  validateBody(transportScheduleExceptionUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const patch = { ...req.body } as Partial<TransportScheduleExceptionDoc>;
    if (patch.effectiveFrom) patch.effectiveFrom = new Date(patch.effectiveFrom as unknown as string);
    if (patch.effectiveUntil) patch.effectiveUntil = new Date(patch.effectiveUntil as unknown as string);

    try {
      const saved = await updateTransportScheduleException(id, patch, req.admin!.email);
      if (!saved) {
        res.status(404).json({ error: 'Schedule exception not found' });
        return;
      }
      res.json(withStatus(saved));
    } catch (err) {
      if (err instanceof ScheduleExceptionArchivedError) {
        res.status(409).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const ok = await deleteTransportScheduleException(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Schedule exception not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.post(
  '/:id/publish',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const result = await publishTransportScheduleException(id, req.admin!.email);
    if (result.ok) {
      res.json(withStatus(result.doc));
      return;
    }
    switch (result.reason) {
      case 'not_found':
        res.status(404).json({ error: 'Schedule exception not found' });
        return;
      case 'archived':
        res.status(409).json({ error: 'This schedule exception is archived and cannot be published' });
        return;
      case 'validation':
        res.status(400).json({ error: 'ValidationFailed', errors: result.errors });
        return;
      case 'conflict':
        res.status(409).json({
          error: 'ScheduleConflict',
          message: 'Another published temporary schedule overlaps the selected period.',
          ...result.conflict,
        });
        return;
    }
  }),
);

router.post(
  '/:id/unpublish',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const result = await unpublishTransportScheduleException(id, req.admin!.email);
    if (result.ok) {
      res.json(withStatus(result.doc));
      return;
    }
    if (result.reason === 'not_found') {
      res.status(404).json({ error: 'Schedule exception not found' });
      return;
    }
    res.status(409).json({ error: 'Only a published schedule exception can be unpublished' });
  }),
);

router.post(
  '/:id/archive',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const saved = await archiveTransportScheduleException(id, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Schedule exception not found' });
      return;
    }
    res.json(withStatus(saved));
  }),
);

router.get(
  '/:id/revisions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const revisions = await listScheduleExceptionRevisions(id);
    res.json({ revisions });
  }),
);

// GET /:id last: more specific routes above (/:id/publish etc.) must not be shadowed.
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertScheduleExceptionId(id, res)) return;

    const doc = await getTransportScheduleExceptionById(id);
    if (!doc) {
      res.status(404).json({ error: 'Schedule exception not found' });
      return;
    }
    res.json(withStatus(doc));
  }),
);

export default router;
