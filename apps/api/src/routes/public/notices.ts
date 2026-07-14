import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { noticesQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getNotices } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get(
  '/',
  validateQuery(noticesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, category } = (
      req as Request & { validatedQuery: { campus: string; category?: string } }
    ).validatedQuery;
    const suffix = category ? `cat:${category}` : 'all';
    const data = await cached(cacheKey('notices', campus, suffix), () =>
      getNotices(campus, category),
    );
    res.json({ campusId: campus, notices: data });
  }),
);

export default router;
