/**
 * IITJ One custom event names.
 * Central registry — add new events here, not scattered in UI code.
 */

export const AppEvents = {
  // Home
  HOME_OPENED: 'home_opened',

  // Mess
  MESS_OPENED: 'mess_opened',
  MEAL_VIEWED: 'meal_viewed',
  MESS_QR_ADDED: 'mess_qr_added',
  MESS_QR_UPDATED: 'mess_qr_updated',
  MESS_QR_DELETED: 'mess_qr_deleted',
  MESS_QR_OPENED: 'mess_qr_opened',

  // Transport
  TRANSPORT_OPENED: 'transport_opened',
  BUS_SCHEDULE_VIEWED: 'bus_schedule_viewed',
  TEMPORARY_SCHEDULE_VIEWED: 'temporary_schedule_viewed',
  TRANSPORT_ALERT_OPENED: 'transport_alert_opened',
  ERICKSHAW_CALLED: 'erickshaw_called',

  // Campus Map
  CAMPUS_MAP_OPENED: 'campus_map_opened',
  LOCATION_SEARCH: 'location_search',
  LOCATION_OPENED: 'location_opened',
  LOCATION_NAVIGATION: 'location_navigation',
  FAVORITE_LOCATION_ADDED: 'favorite_location_added',

  // Campus Apps
  CAMPUS_APP_OPENED: 'campus_app_opened',
  CAMPUS_APP_INSTALL_CLICKED: 'campus_app_install_clicked',
  CAMPUS_APP_WEBSITE_CLICKED: 'campus_app_website_clicked',

  // Search
  GLOBAL_SEARCH: 'global_search',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',

  // Laundry
  LAUNDRY_REMINDER_ENABLED: 'laundry_reminder_enabled',
  LAUNDRY_REMINDER_DISABLED: 'laundry_reminder_disabled',

  // Settings
  THEME_CHANGED: 'theme_changed',
  NOTIFICATION_CHANGED: 'notification_changed',

  // Notes
  NOTE_CREATED: 'note_created',
  NOTE_DELETED: 'note_deleted',

  // Notifications
  NOTIFICATION_OPENED: 'notification_opened',
  NOTIFICATION_RECEIVED: 'notification_received',

  // Notices
  NOTICE_OPENED: 'notice_opened',

  // Sync
  SYNC_COMPLETED: 'sync_completed',
} as const;

export type AppEventName = (typeof AppEvents)[keyof typeof AppEvents];
