import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { servicesPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putServices } from '../../store';
import type { ServicesDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(servicesPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putServices(req.body as ServicesDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
