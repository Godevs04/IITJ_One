import { Router, Request, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { suggestionBodySchema } from '../../models/schemas';
import { suggestionsRateLimiter } from '../../middleware/rateLimit';
import { config } from '../../config';
import { addSuggestion } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.post(
  '/',
  suggestionsRateLimiter,
  validateBody(suggestionBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body as { message: string };
    const doc = await addSuggestion({
      campusId: config.campusId,
      message,
      submittedAt: new Date(),
      status: 'new',
    });
    res.status(201).json({ success: true, id: doc._id });
  }),
);

export default router;
