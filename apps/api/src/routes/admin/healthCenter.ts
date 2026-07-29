import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { healthCenterPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putHealthCenter } from '../../store';
import type { HealthCenterDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(healthCenterPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putHealthCenter(req.body as HealthCenterDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
