/**
 * Guards for URLs sourced from remote/admin-authored content (notices,
 * campus apps) before handing them to Linking.openURL / WebBrowser —
 * defense in depth against a compromised or misconfigured content pipeline
 * storing something like a `javascript:`/`data:`/`file:` URI.
 */

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'file:', 'content:', 'intent:', 'vbscript:'];

/** Strict http(s)-only check — for fields that are always meant to be a web URL (website, store links, notice links). */
export function isHttpUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Looser check for deep links, which are legitimately custom app schemes (e.g. `whatsapp://`) — only blocks known-dangerous schemes. */
export function isSafeDeepLink(value: string | undefined | null): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return !DANGEROUS_SCHEMES.some((scheme) => normalized.startsWith(scheme));
}
