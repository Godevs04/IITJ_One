import { Router, Request, Response } from 'express';
import { getStorageMode } from '../../store';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'iitj1-api',
    storage: getStorageMode(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
