import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { transportPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putTransport } from '../../store';
import type { TransportDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(transportPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putTransport(req.body as TransportDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
