import { Router, Request, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { publicCampaignsQuerySchema, campaignTrackBodySchema } from '../../models/schemas';
import { cached, cacheKey } from '../../cache';
import { getActiveCampaigns, incrementCampaignMetric } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import { campaignTrackRateLimiter } from '../../middleware/rateLimit';
import { isStrictObjectId } from '../../utils/objectId';

const router = Router();

router.get(
  '/',
  validateQuery(publicCampaignsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus, placement } = (
      req as Request & { validatedQuery: { campus: string; placement?: string } }
    ).validatedQuery;
    const suffix = placement ? `placement:${placement}` : 'all';
    const data = await cached(cacheKey('campaigns', campus, suffix), () => getActiveCampaigns(campus, placement));
    res.json({ campusId: campus, campaigns: data });
  }),
);

router.post(
  '/:id/track',
  campaignTrackRateLimiter,
  validateBody(campaignTrackBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!isStrictObjectId(id)) {
      res.status(400).json({ error: 'Invalid campaign id' });
      return;
    }
    const { action, deviceId } = req.body as { action: 'view' | 'click'; deviceId?: string };
    await incrementCampaignMetric(id, action, deviceId || req.ip);
    res.status(204).end();
  }),
);

export default router;
