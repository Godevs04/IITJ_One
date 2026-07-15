import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { portalsPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putPortals } from '../../store';
import type { PortalsDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(portalsPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putPortals(req.body as PortalsDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
