import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { deviceRegisterSchema } from '../../models/schemas';
import { devicesRateLimiter } from '../../middleware/rateLimit';
import { upsertDevice } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import type { AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * Register (or re-register) an FCM device token. Public — the mobile app has
 * no end-user accounts. Upserts by deviceId (a stable per-install identifier
 * the client generates once and persists) rather than by token, since the
 * token itself changes on refresh/reinstall/restore — matching by deviceId
 * means those events update the same device record instead of creating a
 * new one.
 */
router.post(
  '/',
  devicesRateLimiter,
  validateBody(deviceRegisterSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { deviceId, token, platform, appVersion, topics } = req.body as {
      deviceId: string;
      token: string;
      platform: 'ios' | 'android' | 'web';
      appVersion?: string;
      topics?: string[];
    };
    const device = await upsertDevice(deviceId, token, platform, appVersion, topics);
    res.status(200).json({
      success: true,
      device: { deviceId: device.deviceId, token: device.token, platform: device.platform, topics: device.topics },
    });
  }),
);

export default router;
