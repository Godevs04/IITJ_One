import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { buildManifest } from '../../services/home';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get(
  '/manifest',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const data = await cached(cacheKey('meta', campus), () => buildManifest(campus));
    res.json(data);
  }),
);

export default router;
