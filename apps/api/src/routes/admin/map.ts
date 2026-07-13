import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { mapPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putMap } from '../../store';
import type { MapLocationsDoc } from '../../types';

const router = Router();

router.put('/', validateBody(mapPutSchema), async (req: AuthRequest, res: Response) => {
  await putMap(req.body as MapLocationsDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
