import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getSuggestions } from '../../store';

const router = Router();

router.get('/', async (_req: AuthRequest, res: Response) => {
  const suggestions = await getSuggestions();
  res.json({ suggestions });
});

export default router;
