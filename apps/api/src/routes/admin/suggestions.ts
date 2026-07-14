import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { suggestionStatusSchema, adminSuggestionsQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { getSuggestions, updateSuggestionStatus } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.get('/', validateQuery(adminSuggestionsQuerySchema), asyncHandler(async (req, res: Response) => {
  const { status, page, limit } = (
    req as typeof req & {
      validatedQuery: { status?: 'new' | 'read' | 'archived'; page: number; limit: number };
    }
  ).validatedQuery;
  const { items, total } = await getSuggestions(status, page, limit);
  res.json({ suggestions: items, total, page, pageSize: limit });
}));

router.patch('/:id', validateBody(suggestionStatusSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
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
}));

export default router;
