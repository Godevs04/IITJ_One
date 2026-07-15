import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { mapPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putMap } from '../../store';
import type { MapLocationsDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(mapPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putMap(req.body as MapLocationsDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
