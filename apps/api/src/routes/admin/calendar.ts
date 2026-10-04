import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { calendarPutSchema, calendarReviewReopenSchema, calendarReviewResolveSchema } from '../../models/schemas';
import { AuthRequest, requireRole } from '../../middleware/auth';
import { getCalendar, getMeta, putCalendar } from '../../store';
import type { CalendarDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';
import { CalendarReviewError, reopenCalendarConflict, resolveCalendarConflict } from '@iitj1/types';

const router = Router();

const campusOf = (req: AuthRequest): string =>
  typeof req.query.campus === 'string' && req.query.campus ? req.query.campus : 'iitj';

/**
 * Full document for the admin panel, INCLUDING the review queue (unresolved source conflicts with their
 * candidates, PDF wording, pages and history). The public GET /calendar strips the queue.
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const doc = await getCalendar(campusOf(req));
  if (!doc) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }
  res.json(doc);
}));

router.put('/', validateBody(calendarPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putCalendar(req.body as CalendarDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

/**
 * Resolve a review item (plan §10–11). Superadmin only. Never picks a date itself: the body must name a
 * candidate or give explicit dates, plus the source of the decision. The resolved event keeps its
 * candidates, resolution (who/when/source/notes) and full history; the change is audit-logged.
 */
router.post(
  '/review/:id/resolve',
  requireRole('superadmin'),
  validateBody(calendarReviewResolveSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const campusId = campusOf(req);
    const doc = await getCalendar(campusId);
    if (!doc) {
      res.status(404).json({ error: 'Calendar not found' });
      return;
    }
    try {
      const next = resolveCalendarConflict(doc, req.params.id, req.body, req.admin!.email);
      const expected = readExpectedVersion(req) ?? (await getMeta(campusId)).versions.calendar;
      const resolution = next.reviewQueue!.find((c) => c.id === req.params.id)!.resolution!;
      await putCalendar(next, req.admin!.email, expected, {
        action: 'calendar.review.resolve',
        summary: `Resolved ${req.params.id} → ${resolution.resolvedStartDate}..${resolution.resolvedEndDate} (source: ${resolution.resolvedSource})`,
      });
      res.json({ success: true, resolution });
    } catch (err) {
      if (err instanceof CalendarReviewError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

router.post(
  '/review/:id/reopen',
  requireRole('superadmin'),
  validateBody(calendarReviewReopenSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const campusId = campusOf(req);
    const doc = await getCalendar(campusId);
    if (!doc) {
      res.status(404).json({ error: 'Calendar not found' });
      return;
    }
    try {
      const next = reopenCalendarConflict(doc, req.params.id, req.admin!.email, req.body.note);
      const expected = readExpectedVersion(req) ?? (await getMeta(campusId)).versions.calendar;
      await putCalendar(next, req.admin!.email, expected, {
        action: 'calendar.review.reopen',
        summary: `Re-opened ${req.params.id}${req.body.note ? ` (${req.body.note})` : ''}`,
      });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof CalendarReviewError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

export default router;
