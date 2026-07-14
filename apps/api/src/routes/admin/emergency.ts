import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { emergencyPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putEmergency } from '../../store';
import type { EmergencyDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(emergencyPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putEmergency(req.body as EmergencyDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
