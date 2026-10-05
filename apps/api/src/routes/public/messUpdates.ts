import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { publicMessUpdatesQuerySchema } from '../../models/schemas';
import { getTemporaryMessUpdatesForDate } from '../../store';

import { getIstDateString } from '../../utils/istTime';
import { isMessUpdateActive } from '@iitj1/types';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

// Deliberately not cached with versioning: activation and expiry are time-based.
router.get(
  '/active',
  validateQuery(publicMessUpdatesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, date } = (
      req as Request & { validatedQuery: { campus: string; date?: string } }
    ).validatedQuery;
    const targetDate = date || getIstDateString();
    const updates = await getTemporaryMessUpdatesForDate(campus, targetDate, true);
    const now = new Date();
    const active = updates.filter((u) => isMessUpdateActive(u, now));


    res.json({
      campusId: campus,
      date: targetDate,
      hasUpdates: active.length > 0,
      updates: active,
    });
  }),
);

router.get(
  '/',
  validateQuery(publicMessUpdatesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, date } = (
      req as Request & { validatedQuery: { campus: string; date?: string } }
    ).validatedQuery;
    const targetDate = date || getIstDateString();
    const updates = await getTemporaryMessUpdatesForDate(campus, targetDate);

    res.json({
      campusId: campus,
      date: targetDate,
      updates,
    });
  }),
);

export default router;
