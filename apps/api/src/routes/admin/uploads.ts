import { Router, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../../middleware/auth';
import { config } from '../../config';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

/**
 * Returns a Cloudinary signed upload payload when env is configured.
 * Admin UI may fall back to pasting a URL if Cloudinary is unset.
 */
router.post('/sign', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const { cloudName, apiKey, apiSecret, folder } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({
      error: 'Cloudinary is not configured on this server',
      configured: false,
    });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  res.json({
    configured: true,
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  });
}));

export default router;
