import crypto from 'crypto';
import { config } from '../config';

/** Extracts a Cloudinary public_id from one of our own stored secure_urls (never a transformed/render-time URL, so no transformation segments to strip). */
function extractPublicId(url: string, cloudName: string): string | null {
  const marker = `res.cloudinary.com/${cloudName}/image/upload/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let rest = url.slice(idx + marker.length);
  rest = rest.replace(/^v\d+\//, '');
  rest = rest.replace(/\.[a-zA-Z0-9]+$/, '');
  return rest || null;
}

/**
 * Best-effort delete of a Cloudinary-hosted image. Never throws — a failed
 * cleanup just leaves one orphaned asset behind, which isn't worth blocking
 * or failing the caller's own request (a campaign/notice save) over.
 */
export async function destroyCloudinaryImage(url: string | undefined | null): Promise<void> {
  if (!url) return;
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) return;
  const publicId = extractPublicId(url, cloudName);
  if (!publicId) return;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    // Best-effort — see doc comment above.
  }
}

/** Destroys every URL present in `before` but no longer present in `after` — the set of images an update actually replaced. */
export async function destroyRemovedCloudinaryImages(
  before: (string | undefined)[],
  after: (string | undefined)[],
): Promise<void> {
  const afterSet = new Set(after.filter(Boolean));
  const removed = before.filter((url): url is string => !!url && !afterSet.has(url));
  await Promise.all(removed.map((url) => destroyCloudinaryImage(url)));
}
