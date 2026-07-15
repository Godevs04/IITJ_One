import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { laundryPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putLaundry } from '../../store';
import type { LaundryDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(laundryPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putLaundry(req.body as LaundryDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
