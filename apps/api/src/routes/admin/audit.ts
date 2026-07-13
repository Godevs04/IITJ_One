import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getAuditLog } from '../../store';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const limit = parseInt((req.query.limit as string) ?? '100', 10);
  const logs = await getAuditLog(limit);
  res.json({ logs });
});

export default router;
