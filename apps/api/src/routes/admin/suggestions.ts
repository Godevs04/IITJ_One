import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { suggestionStatusSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { getSuggestions, updateSuggestionStatus } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';

const router = Router();

router.get('/', async (_req: AuthRequest, res: Response) => {
  const suggestions = await getSuggestions();
  res.json({ suggestions });
});

router.patch('/:id', validateBody(suggestionStatusSchema), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  if (isDbConnected() && !isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid suggestion id' });
    return;
  }
  const { status } = req.body as { status: 'new' | 'read' | 'archived' };
  const saved = await updateSuggestionStatus(id, status);
  if (!saved) {
    res.status(404).json({ error: 'Suggestion not found' });
    return;
  }
  res.json(saved);
});

export default router;
