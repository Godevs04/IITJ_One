import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { appsPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putApps } from '../../store';
import type { AppsDoc } from '../../types';

const router = Router();

router.put('/', validateBody(appsPutSchema), async (req: AuthRequest, res: Response) => {
  await putApps(req.body as AppsDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
