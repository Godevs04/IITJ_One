/**
 * Firebase services barrel export.
 * Import from '@/services/firebase' for all Firebase functionality.
 */

export { initFirebase, isFirebaseReady, isAnalyticsEnabled, isCrashlyticsEnabled } from './firebase';
export * as FirebaseAnalytics from './analytics';
export * as FirebaseCrashlytics from './crashlytics';
export * as FirebasePerformance from './performance';
export * as RemoteConfig from './remoteConfig';
export { Analytics } from './trackingApi';
export { TraceNames } from './performance';
export { AppEvents, type AppEventName } from './events';
export { useScreenTracking } from './screenTracker';
export { setDefaultUserProperties, updateUserProperty } from './userProperties';
export { fetchRemoteConfig, getBoolean, getString, getNumber } from './remoteConfig';
export {
  initFCM,
  teardownFCM,
  subscribeToTopic,
  unsubscribeFromTopic,
  syncTopicSubscriptions,
  getHistory as getNotificationHistory,
  markAsRead as markNotificationRead,
  markAllAsRead as markAllNotificationsRead,
  getUnreadCount,
  clearHistory as clearNotificationHistory,
  registerBackgroundHandler,
  FCM_TOPICS,
  type FCMTopic,
  type NotificationRecord,
} from './messaging';
