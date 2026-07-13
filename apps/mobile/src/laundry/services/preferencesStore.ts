import { getSetting, setSetting } from '@/services/cache';
import { DEFAULT_LAUNDRY_PREFERENCES, type LaundryPreferences } from '../types';

const PREFS_KEY = 'laundryPrefs';

/**
 * Local-only today — the app has no user accounts yet, so preferences live
 * on-device (same as Timetable/Notes/Mess QR). Swap `laundryPreferencesStore`
 * for a cloud-backed implementation once auth exists; the screen only calls
 * this interface, not AsyncStorage directly.
 */
export interface LaundryPreferencesStore {
  get(): LaundryPreferences;
  save(prefs: LaundryPreferences): void;
}

class LocalLaundryPreferencesStore implements LaundryPreferencesStore {
  get(): LaundryPreferences {
    return getSetting<LaundryPreferences>(PREFS_KEY, DEFAULT_LAUNDRY_PREFERENCES);
  }

  save(prefs: LaundryPreferences): void {
    setSetting(PREFS_KEY, prefs);
  }
}

export const laundryPreferencesStore: LaundryPreferencesStore = new LocalLaundryPreferencesStore();
