import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { transportAlertsPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putTransportAlerts } from '../../store';
import type { TransportAlertsDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(transportAlertsPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putTransportAlerts(req.body as TransportAlertsDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
