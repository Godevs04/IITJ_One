import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { transportAlertsPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import type { TransportAlertsDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';
import { replaceTransportAlerts } from '../../services/transportAlerts';

const router = Router();

router.put('/', validateBody(transportAlertsPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { value } = await replaceTransportAlerts(req.body as TransportAlertsDoc, req.admin!.email, readExpectedVersion(req));
  if (!value.ok) {
    // `details.formErrors` is what the admin panel's error toast already renders.
    res.status(400).json({ error: 'Alert validation failed', details: { formErrors: value.reason === 'invalid' ? value.errors : ['Not found'] } });
    return;
  }
  res.json({ success: true });
}));

export default router;
