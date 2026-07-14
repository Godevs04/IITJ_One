import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getWifi } from '../../store';

const router = Router();

router.get(
  '/',
  validateQuery(campusQuerySchema),
  async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const data = await cached(cacheKey('wifi', campus), () => getWifi(campus));
    if (!data) {
      res.status(404).json({ error: 'Wi-Fi guides not found' });
      return;
    }
    res.json(data);
  },
);

export default router;
