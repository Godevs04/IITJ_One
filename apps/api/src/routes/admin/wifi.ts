import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { wifiPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putWifi } from '../../store';
import type { WifiDoc } from '../../types';

const router = Router();

router.put('/', validateBody(wifiPutSchema), async (req: AuthRequest, res: Response) => {
  await putWifi(req.body as WifiDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
