import { Router, Request, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { suggestionBodySchema } from '../../models/schemas';
import { suggestionsRateLimiter } from '../../middleware/rateLimit';
import { config } from '../../config';
import { addSuggestion } from '../../store';
import type { SuggestionDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.post(
  '/',
  suggestionsRateLimiter,
  validateBody(suggestionBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { message, category, name, email, deviceId, platform, appVersion } = req.body as {
      message: string;
      category: SuggestionDoc['category'];
      name?: string;
      email?: string;
      deviceId?: string;
      platform?: string;
      appVersion?: string;
    };
    const doc = await addSuggestion({
      campusId: config.campusId,
      message,
      category,
      name,
      email,
      deviceId,
      platform,
      appVersion,
      submittedAt: new Date(),
      status: 'new',
    });
    res.status(201).json({ success: true, id: doc._id });
  }),
);

export default router;
