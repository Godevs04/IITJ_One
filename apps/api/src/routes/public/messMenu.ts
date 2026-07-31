import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { messMenuQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getMessMenu } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get(
  '/',
  validateQuery(messMenuQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, menuType } = (
      req as Request & { validatedQuery: { campus: string; menuType: 'veg' | 'non-veg' } }
    ).validatedQuery;
    // Cache key MUST match the exact module-name string bumpVersion/invalidateModule use
    // (messMenuVeg/messMenuNonVeg) — a suffix-based key here would silently break cache
    // invalidation on publish (invalidateModule does a prefix match on that exact string).
    const versionModule = menuType === 'veg' ? 'messMenuVeg' : 'messMenuNonVeg';
    const data = await cached(cacheKey(versionModule, campus), () => getMessMenu(campus, menuType));
    if (!data) {
      res.status(404).json({ error: 'Mess menu not published yet' });
      return;
    }
    res.json(data);
  }),
);

export default router;
