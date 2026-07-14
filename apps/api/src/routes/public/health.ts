import { Router, Request, Response } from 'express';
import { isProduction } from '../../config';
import { getStorageMode } from '../../store';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const storage = getStorageMode();
  const degraded = isProduction && storage === 'fallback';

  res.json({
    status: degraded ? 'degraded' : 'ok',
    service: 'iitj1-api',
    storage,
    writableAdmin: storage === 'mongodb' || !isProduction,
    timestamp: new Date().toISOString(),
  });
});

export default router;
