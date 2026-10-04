import { Router, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate';
import { holidaysPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import type { HolidaysDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';
import { previewHolidayTransport, replaceHolidays } from '../../services/holidays';

const router = Router();

router.put('/', validateBody(holidaysPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { value } = await replaceHolidays(req.body as HolidaysDoc, req.admin!.email, readExpectedVersion(req));
  if (!value.ok) {
    // `details.formErrors` is what the admin panel's error toast already renders.
    res.status(400).json({ error: 'Holiday validation failed', details: { formErrors: value.reason === 'invalid' ? value.errors : ['Not found'] } });
    return;
  }
  res.json({ success: true });
}));

const previewSchema = z.object({
  campusId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  setActive: z.boolean(),
});

/** Read-only: which bus timetable the date gets now vs. with a holiday active/inactive. Writes nothing. */
router.post('/preview', validateBody(previewSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { campusId, date, setActive } = req.body as z.infer<typeof previewSchema>;
  res.json(await previewHolidayTransport(campusId, date, { setActive }));
}));

export default router;
