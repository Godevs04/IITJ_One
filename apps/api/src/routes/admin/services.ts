import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { servicesPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putServices } from '../../store';
import type { ServicesDoc } from '../../types';

const router = Router();

router.put('/', validateBody(servicesPutSchema), async (req: AuthRequest, res: Response) => {
  await putServices(req.body as ServicesDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
