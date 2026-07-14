import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { erickshawPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putErickshaw } from '../../store';
import type { ErickshawDoc } from '../../types';

const router = Router();

router.put('/', validateBody(erickshawPutSchema), async (req: AuthRequest, res: Response) => {
  await putErickshaw(req.body as ErickshawDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
