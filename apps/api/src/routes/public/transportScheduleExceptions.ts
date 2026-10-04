import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { activeTransportScheduleExceptionQuerySchema, transportForDateQuerySchema } from '../../models/schemas';
import { getActiveTransportScheduleException, getTransportScheduleExceptionForDay } from '../../store';
import { istDayBounds } from '@iitj1/types';
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

/**
 * Read-only: which special (date-specific) transport schedule, if any, applies on an IST calendar date.
 * Lets a future-dated academic-calendar holiday show the schedule transport admins actually published,
 * instead of guessing. Returns only stored data — never synthesizes trips.
 */
router.get(
  '/for-date',
  validateQuery(transportForDateQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, date } = (req as Request & { validatedQuery: { campus: string; date: string } }).validatedQuery;
    const { start, end } = istDayBounds(date);
    const schedule = await getTransportScheduleExceptionForDay(campus, start, end);
    if (!schedule) {
      res.json({ date, hasTemporarySchedule: false, status: null, priority: null, banner: false, schedule: null });
      return;
    }
    const status = computeScheduleStatus(schedule);
    res.json({ date, hasTemporarySchedule: true, status, priority: schedule.priority, banner: schedule.showBanner, schedule: { ...schedule, status } });
  }),
);

export default router;
