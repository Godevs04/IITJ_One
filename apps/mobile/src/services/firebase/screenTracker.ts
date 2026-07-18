/**
 * Automatic screen tracking for expo-router.
 * Listens to navigation state changes and logs screen_view events.
 * Used as a hook in the root navigator — no manual logging in screens.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { Analytics } from './trackingApi';
import { setAttribute } from './crashlytics';

/**
 * Converts a pathname like "/transport" to a screen name like "Transport".
 * Handles nested routes: "/(tabs)/menu" → "Menu"
 */
export function pathnameToScreenName(pathname: string): string {
  // Remove group segments like (tabs)
  const cleaned = pathname
    .split('/')
    .filter((seg) => seg && !seg.startsWith('('))
    .join('/');

  if (!cleaned || cleaned === '/') return 'Home';

  // Convert to PascalCase-ish: "notes/edit" → "Notes/Edit"
  return cleaned
    .split('/')
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join('/');
}

/**
 * Hook that automatically tracks screen views via Firebase Analytics.
 * Place this once in the root navigator component.
 */
export function useScreenTracking(): void {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === previousPathname.current) return;
    previousPathname.current = pathname;

    const screenName = pathnameToScreenName(pathname);

    // Log to Firebase Analytics + backend analytics (single choke point — see trackingApi.ts)
    Analytics.trackScreen(screenName, screenName);

    // Set current screen in Crashlytics for crash context
    void setAttribute('current_screen', screenName);
  }, [pathname]);
}
