import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { aboutPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putAbout } from '../../store';
import type { AboutDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(aboutPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putAbout(req.body as AboutDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
