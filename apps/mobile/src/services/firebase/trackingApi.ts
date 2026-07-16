/**
 * Analytics — public event tracking API.
 * UI components should ONLY use this module. Never call Firebase directly.
 *
 * Usage:
 *   import { Analytics } from '@/services/firebase';
 *   Analytics.trackEvent('home_opened');
 */

import {
  logScreenView,
  logEvent,
  setUserId,
  setUserProperty,
  setUserProperties,
  resetAnalytics,
} from './analytics';
import { trackBackendEvent, trackBackendScreen } from '@/services/analytics/backendAnalytics';

type EventParams = Record<string, string | number | boolean | undefined>;

export const Analytics = {
  /** Track a screen view (use useScreenTracking hook instead for auto-tracking). */
  trackScreen(screenName: string, screenClass?: string) {
    void logScreenView(screenName, screenClass);
    trackBackendScreen(screenName);
  },

  /** Track a custom event with optional parameters. Sent to both Firebase Analytics AND the backend analytics pipeline — do not add a second call site for the backend, this is the only one. */
  trackEvent(name: string, params?: EventParams) {
    void logEvent(name, params);
    trackBackendEvent(name, params);
  },

  /** Track an error event (non-fatal, for analytics insight). */
  trackError(errorName: string, message?: string) {
    void logEvent('app_error', {
      error_name: errorName,
      error_message: message,
    });
    trackBackendEvent('app_error', {
      error_name: errorName,
      error_message: message,
    });
  },

  /** Set anonymous user ID for analytics correlation. */
  setUserId(id: string | null) {
    void setUserId(id);
  },

  /** Set a single user property. */
  setUserProperty(name: string, value: string | null) {
    void setUserProperty(name, value);
  },

  /** Set multiple user properties at once. */
  setUserProperties(props: Record<string, string | null>) {
    void setUserProperties(props);
  },

  /** Reset all analytics data (e.g. on logout or data clear). */
  reset() {
    void resetAnalytics();
  },
} as const;
