/**
 * User properties management.
 * Sets anonymous properties for analytics segmentation.
 * Call once at app startup and whenever properties change.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Analytics } from './trackingApi';
import { setAttributes as setCrashlyticsAttributes, setAttribute as setCrashlyticsAttribute } from './crashlytics';
import { getSetting } from '@/services/cache';

/** Set all default user properties at app startup. */
export function setDefaultUserProperties(): void {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const platform = Platform.OS;
  const theme = getSetting('darkMode', false) ? 'dark' : 'light';
  const hostel = getSetting<string>('hostel', 'unknown');
  const language = getSetting<string>('language', 'en');
  const deviceType = Platform.OS === 'ios' ? 'iPhone' : 'Android';

  Analytics.setUserProperties({
    platform,
    app_version: appVersion,
    theme,
    hostel,
    language,
    device_type: deviceType,
  });

  // Also set in Crashlytics for crash context
  void setCrashlyticsAttributes({
    platform,
    app_version: appVersion,
    theme,
    hostel,
    device_type: deviceType,
  });
}

/** Update a single user property (e.g. when theme changes). */
export function updateUserProperty(name: string, value: string): void {
  Analytics.setUserProperty(name, value);
  void setCrashlyticsAttribute(name, value);
}
