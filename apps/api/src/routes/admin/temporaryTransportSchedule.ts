import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { temporaryTransportSchedulePutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putTemporaryTransportSchedule } from '../../store';
import type { TemporaryTransportScheduleDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(temporaryTransportSchedulePutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putTemporaryTransportSchedule(req.body as TemporaryTransportScheduleDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
