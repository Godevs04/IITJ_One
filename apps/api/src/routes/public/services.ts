import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { servicesQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getServices } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get(
  '/',
  validateQuery(servicesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, category, q } = (
      req as Request & { validatedQuery: { campus: string; category?: string; q?: string } }
    ).validatedQuery;
    const suffix = [category, q].filter(Boolean).join(':') || 'all';
    const data = await cached(cacheKey('services', campus, suffix), () =>
      getServices(campus, category, q),
    );
    if (!data) {
      res.status(404).json({ error: 'Services not found' });
      return;
    }
    res.json(data);
  }),
);

export default router;
