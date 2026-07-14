import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { laundryPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putLaundry } from '../../store';
import type { LaundryDoc } from '../../types';

const router = Router();

router.put('/', validateBody(laundryPutSchema), async (req: AuthRequest, res: Response) => {
  await putLaundry(req.body as LaundryDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
