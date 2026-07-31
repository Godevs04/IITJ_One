const UPLOAD_MARKER = '/image/upload/';

/**
 * Injects Cloudinary's delivery transformations (auto format, auto quality,
 * and a bounding width) into a Cloudinary-hosted image URL. Non-Cloudinary
 * URLs pass through unchanged.
 */
export function optimizeCloudinaryUrl(url: string | undefined, width: number): string | undefined {
  if (!url) return url;
  const index = url.indexOf(UPLOAD_MARKER);
  if (index === -1) return url;
  const insertAt = index + UPLOAD_MARKER.length;
  return `${url.slice(0, insertAt)}f_auto,q_auto,w_${Math.round(width)}/${url.slice(insertAt)}`;
}
