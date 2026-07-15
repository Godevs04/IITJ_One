import { Router, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { adminAuditQuerySchema } from '../../models/schemas';
import { getAuditLog } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get('/', validateQuery(adminAuditQuerySchema), asyncHandler(async (req, res: Response) => {
  const { page, limit } = (
    req as typeof req & { validatedQuery: { page: number; limit: number } }
  ).validatedQuery;
  const { items, total } = await getAuditLog(page, limit);
  res.json({ logs: items, total, page, pageSize: limit });
}));

export default router;
