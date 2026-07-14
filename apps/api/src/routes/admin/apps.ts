import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { appsPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putApps } from '../../store';
import type { AppsDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(appsPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putApps(req.body as AppsDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
