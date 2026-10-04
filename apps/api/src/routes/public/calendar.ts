import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getCalendar } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import { toPublicCalendarDoc } from '@iitj1/types';

const router = Router();

router.get(
  '/',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const data = await cached(cacheKey('calendar', campus), () => getCalendar(campus));
    if (!data) {
      res.status(404).json({ error: 'Calendar not found' });
      return;
    }
    // Unresolved source conflicts (reviewQueue) are admin-only and never reach students.
    res.json(toPublicCalendarDoc(data));
  }),
);

export default router;
