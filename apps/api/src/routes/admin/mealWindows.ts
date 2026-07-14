import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { mealWindowsPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putMealWindows } from '../../store';
import type { MealWindowsDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

router.put('/', validateBody(mealWindowsPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  await putMealWindows(req.body as MealWindowsDoc, req.admin!.email, readExpectedVersion(req));
  res.json({ success: true });
}));

export default router;
