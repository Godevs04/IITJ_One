import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { holidaysPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putHolidays } from '../../store';
import type { HolidaysDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(holidaysPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putHolidays(req.body as HolidaysDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
