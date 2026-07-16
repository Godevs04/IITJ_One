import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { analyticsBatchSchema, analyticsPingSchema } from '../../models/schemas';
import { analyticsEventsRateLimiter, analyticsPingRateLimiter } from '../../middleware/rateLimit';
import { insertAnalyticsEvents, recordHeartbeat, type IncomingAnalyticsEvent } from '../../services/analytics';
import { asyncHandler } from '../../middleware/asyncHandler';
import type { AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * Batch event ingestion. Public — the mobile app has no end-user accounts,
 * and events are anonymous (sessionId only, no PII — see sanitizeParams in
 * services/analytics.ts, applied server-side as well as client-side).
 */
router.post(
  '/events',
  analyticsEventsRateLimiter,
  validateBody(analyticsBatchSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { events } = req.body as { events: IncomingAnalyticsEvent[] };
    const count = await insertAnalyticsEvents(events);
    res.status(200).json({ success: true, received: count });
  }),
);

/** Lightweight liveness ping — updates the "live users" window (see GET /admin/analytics/live). */
router.post(
  '/ping',
  analyticsPingRateLimiter,
  validateBody(analyticsPingSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId, platform, appVersion } = req.body as {
      sessionId: string;
      platform: 'ios' | 'android' | 'web';
      appVersion?: string;
    };
    await recordHeartbeat(sessionId, platform, appVersion);
    res.status(200).json({ success: true });
  }),
);

export default router;
