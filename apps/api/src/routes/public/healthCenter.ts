import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getHealthCenter } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get(
  '/',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const data = await cached(
      cacheKey('healthCenter', campus),
      () => getHealthCenter(campus),
      6 * 60 * 60,
    );
    if (!data) {
      res.status(404).json({ error: 'Health Center info not found' });
      return;
    }
    res.json(data);
  }),
);

export default router;
