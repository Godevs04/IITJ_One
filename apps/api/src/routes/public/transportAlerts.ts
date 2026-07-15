import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { getTransportAlerts } from '../../store';
import { cached, cacheKey } from '../../cache';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get(
  '/',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const data = await cached(cacheKey('transportAlerts', campus), () => getTransportAlerts(campus));
    if (!data) {
      res.status(404).json({ error: 'Transport alerts not found' });
      return;
    }
    res.json(data);
  }),
);

export default router;
