import { router } from 'expo-router';

/**
 * `router.back()` is a silent no-op when there is nothing behind the current
 * screen — e.g. a screen opened from a push notification, a deep link, or
 * after a cold start — which reads to users as "the back button is broken".
 * Fall back to Home in that case.
 */
export function goBack(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
