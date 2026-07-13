import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { transportPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putTransport } from '../../store';
import type { TransportDoc } from '../../types';

const router = Router();

router.put('/', validateBody(transportPutSchema), async (req: AuthRequest, res: Response) => {
  await putTransport(req.body as TransportDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
