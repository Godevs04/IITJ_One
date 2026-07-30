import { log as crashLog } from '@/services/firebase/crashlytics';

export type NotificationErrorCategory =
  | 'permission_denied'
  | 'offline'
  | 'temporary_failure'
  | 'unavailable';

export interface SanitizedNotificationResult {
  category: NotificationErrorCategory;
  userMessage: string;
}

/**
 * Sanitizes notification and push registration errors so technical SDK / Expo / Firebase / HTTP
 * details are logged internally for developers and replaced with friendly, actionable messaging for users.
 */
export function sanitizeNotificationError(
  err: unknown,
  contextTag = 'notifications',
): SanitizedNotificationResult {
  const errorMessage = err instanceof Error ? err.message : String(err ?? '');
  const lowerMessage = errorMessage.toLowerCase();

  // Log full technical error details internally for debugging
  console.warn(`[${contextTag}] Technical error:`, err);
  void crashLog(`[${contextTag}] Error: ${errorMessage}`);

  // Identify error category & map to safe, friendly user copy
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('denied') ||
    lowerMessage.includes('not granted')
  ) {
    return {
      category: 'permission_denied',
      userMessage:
        "Notifications are disabled. Enable them in Settings if you'd like to receive important campus updates.",
    };
  }

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('offline') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('internet')
  ) {
    return {
      category: 'offline',
      userMessage: 'Check your internet connection and try again.',
    };
  }

  if (
    lowerMessage.includes('web') ||
    lowerMessage.includes('unsupported') ||
    lowerMessage.includes('not available')
  ) {
    return {
      category: 'unavailable',
      userMessage: 'Notifications are available on supported iOS and Android devices.',
    };
  }

  return {
    category: 'temporary_failure',
    userMessage: "Notifications couldn't be enabled right now. Please try again later.",
  };
}
