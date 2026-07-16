/**
 * Hook to consume Remote Config values reactively.
 * Provides typed access to feature flags and maintenance state.
 */

import { useMemo } from 'react';
import { RemoteConfig } from '@/services/firebase';

export interface AppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minimumSupportedVersion: string;
  showTransportBanner: boolean;
  transportMessage: string;
  enableCravee: boolean;
  enableIsthara: boolean;
  enableNewFeatures: boolean;
  enableSearch: boolean;
  enableNotifications: boolean;
}

/**
 * Returns the current Remote Config values.
 * Uses defaults when Remote Config hasn't fetched yet or is unavailable.
 */
export function useRemoteConfig(): AppConfig {
  return useMemo(() => ({
    maintenanceMode: RemoteConfig.getBoolean('maintenance_mode'),
    maintenanceMessage: RemoteConfig.getString('maintenance_message'),
    minimumSupportedVersion: RemoteConfig.getString('minimum_supported_version'),
    showTransportBanner: RemoteConfig.getBoolean('show_transport_banner'),
    transportMessage: RemoteConfig.getString('transport_message'),
    enableCravee: RemoteConfig.getBoolean('enable_cravee'),
    enableIsthara: RemoteConfig.getBoolean('enable_isthara'),
    enableNewFeatures: RemoteConfig.getBoolean('enable_new_features'),
    enableSearch: RemoteConfig.getBoolean('enable_search'),
    enableNotifications: RemoteConfig.getBoolean('enable_notifications'),
  }), []);
}

/**
 * Check if the current app version meets the minimum required version.
 */
export function isVersionSupported(currentVersion: string, minimumVersion: string): boolean {
  const current = currentVersion.split('.').map(Number);
  const minimum = minimumVersion.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const c = current[i] ?? 0;
    const m = minimum[i] ?? 0;
    if (c > m) return true;
    if (c < m) return false;
  }
  return true;
}
