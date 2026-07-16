/**
 * Stable per-install device identifier. Generated once on first launch and
 * persisted locally — unlike the FCM token (which changes on refresh), this
 * never changes for the lifetime of the install, so the backend can use it
 * as the durable key for a device record instead of the token.
 */
import * as Crypto from 'expo-crypto';
import { getSetting, setSetting } from '@/services/cache';

const DEVICE_ID_KEY = 'fcm:deviceId';

export function getOrCreateDeviceId(): string {
  const existing = getSetting<string | null>(DEVICE_ID_KEY, null);
  if (existing) return existing;

  const id = Crypto.randomUUID();
  setSetting(DEVICE_ID_KEY, id);
  return id;
}
