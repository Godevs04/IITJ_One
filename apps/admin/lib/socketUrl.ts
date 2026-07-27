import { getTransportConfig } from './transportConfig';

const SOCKET_PATH = '/api/v1/socket.io';

/**
 * Resolves the real API origin for the WebSocket handshake, shared by both
 * Socket.IO clients (lib/liveSocket.ts's observer and lib/driverSocket.ts's
 * ride-capable client). The REST client (lib/api.ts) can fall back to a
 * same-origin `/backend/api/v1` Next.js rewrite when NEXT_PUBLIC_API_URL
 * isn't set — that proxies plain HTTP fine, but WebSocket upgrade proxying
 * through it isn't guaranteed by every deployment's reverse proxy. Priority:
 * explicit NEXT_PUBLIC_SOCKET_URL override (transportConfig, e.g. for a
 * driver phone browser on campus WiFi that needs a LAN IP) > absolute
 * NEXT_PUBLIC_API_URL > same-origin rewrite fallback.
 */
export function resolveSocketBaseUrl(): string {
  const override = getTransportConfig().socketUrlOverride;
  if (override) return override.replace(/\/$/, '');

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/api\/v1\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function resolveSocketPath(): string {
  const override = getTransportConfig().socketUrlOverride;
  if (override) return SOCKET_PATH;

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return SOCKET_PATH;
  }
  // Same-origin fallback goes through the /backend rewrite (next.config.mjs)
  // so the path must include that prefix for the proxy rule to match.
  return `/backend${SOCKET_PATH}`;
}
