import * as FileSystem from 'expo-file-system/legacy';
import { getSetting, setSetting } from './cache';

/**
 * Mess QR storage — local only, never synced.
 * Image file lives in app documents; metadata in local cache.
 */

export interface MessQR {
  imagePath: string;
  addedAt: string;
}

const MESS_QR_KEY = 'messQr';

export function getMessQR(): MessQR | null {
  return getSetting<MessQR | null>(MESS_QR_KEY, null);
}

export async function saveMessQRFromUri(uri: string): Promise<MessQR> {
  const directory = `${FileSystem.documentDirectory}mess-qr/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const destination = `${directory}mess-qr-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destination });

  const existing = getMessQR();
  if (existing?.imagePath) {
    await FileSystem.deleteAsync(existing.imagePath, { idempotent: true });
  }

  const record: MessQR = {
    imagePath: destination,
    addedAt: new Date().toISOString(),
  };

  setSetting(MESS_QR_KEY, record);
  return record;
}

export async function clearMessQR(): Promise<void> {
  const existing = getMessQR();
  if (existing?.imagePath) {
    await FileSystem.deleteAsync(existing.imagePath, { idempotent: true });
  }
  setSetting(MESS_QR_KEY, null);
}
