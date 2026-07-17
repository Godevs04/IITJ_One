import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { activeTransportScheduleExceptionQuerySchema } from '../../models/schemas';
import { getActiveTransportScheduleException } from '../../store';
import { computeScheduleStatus } from '../../services/transportScheduleExceptionStatus';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

// Deliberately not cached: this is the one endpoint where staleness directly
// breaks the "auto-expire with no cron" promise, and it's a cheap indexed lookup.
router.get(
  '/active',
  validateQuery(activeTransportScheduleExceptionQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const schedule = await getActiveTransportScheduleException(campus);

    if (!schedule) {
      res.json({ hasTemporarySchedule: false, status: null, priority: null, banner: false, schedule: null });
      return;
    }

    const status = computeScheduleStatus(schedule);
    res.json({
      hasTemporarySchedule: true,
      status,
      priority: schedule.priority,
      banner: schedule.showBanner,
      schedule: { ...schedule, status },
    });
  }),
);

export default router;
