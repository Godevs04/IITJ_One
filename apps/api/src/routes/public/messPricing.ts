import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getPublicMessPricing } from '../../services/messPricing';

/**
 * Public mess pricing for the app (no admin auth): the active configurations, oldest first. The app picks
 * the one in effect for today, so scheduled prices switch at midnight without a new sync.
 */
const router = Router();

router.get(
  '/',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    res.json(await cached(cacheKey('messPricing', campus), () => getPublicMessPricing(campus)));
  }),
);

export default router;
