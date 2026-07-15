import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { getSetting, setSetting } from './cache';
import type { LocalStore } from './localStore';

/**
 * Mess QR storage — local only, never synced.
 * Image file lives in the persistent document directory (never cache);
 * metadata lives in the local settings store.
 */

export interface MessQR {
  imagePath: string;
  addedAt: string;
  width: number;
  height: number;
}

export type MessQrErrorReason = 'permission_denied' | 'invalid_image' | 'storage_full' | 'unknown';

export class MessQrStorageError extends Error {
  reason: MessQrErrorReason;

  constructor(reason: MessQrErrorReason, message?: string) {
    super(message ?? reason);
    this.name = 'MessQrStorageError';
    this.reason = reason;
  }
}

export interface MessQrStore extends LocalStore<MessQR | null> {
  /** Copies the picked/cropped image into persistent storage and records it. */
  saveFromUri(uri: string, mimeType?: string | null): Promise<MessQR>;
  clear(): Promise<void>;
}

const MESS_QR_KEY = 'messQr';
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error instanceof Error ? error : new Error('Failed to read image')),
    );
  });
}

/**
 * Checks the file's actual bytes rather than trusting a caller-supplied
 * mimeType (which is just a string a caller could get wrong or omit — the
 * only real call site never passes one). JPEG starts with FF D8 FF
 * (base64 "/9j/"); PNG starts with the 8-byte PNG signature (base64
 * "iVBORw0KGgo"). ImageCropEditor always re-encodes to JPEG, so this is
 * primarily a JPEG check, with PNG accepted for robustness.
 */
async function hasValidImageSignature(uri: string): Promise<boolean> {
  try {
    const header = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 8,
    });
    return header.startsWith('/9j/') || header.startsWith('iVBORw0KGgo');
  } catch {
    return false;
  }
}

class LocalMessQrStore implements MessQrStore {
  async get(): Promise<MessQR | null> {
    return getSetting<MessQR | null>(MESS_QR_KEY, null);
  }

  async save(value: MessQR | null): Promise<void> {
    setSetting(MESS_QR_KEY, value);
  }

  async saveFromUri(uri: string, mimeType?: string | null): Promise<MessQR> {
    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new MessQrStorageError('invalid_image', 'Please choose a JPEG or PNG image.');
    }

    let width: number;
    let height: number;
    try {
      const size = await getImageSize(uri);
      width = size.width;
      height = size.height;
    } catch {
      throw new MessQrStorageError('invalid_image', 'That file could not be read as an image.');
    }

    const directory = `${FileSystem.documentDirectory}mess-qr/`;
    try {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const destination = `${directory}mess-qr-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: destination });

      if (!(await hasValidImageSignature(destination))) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
        throw new MessQrStorageError('invalid_image', 'That file is not a valid JPEG or PNG image.');
      }

      const existing = await this.get();
      if (existing?.imagePath && existing.imagePath !== destination) {
        await FileSystem.deleteAsync(existing.imagePath, { idempotent: true });
      }

      const record: MessQR = { imagePath: destination, addedAt: new Date().toISOString(), width, height };
      await this.save(record);
      return record;
    } catch (err) {
      if (err instanceof MessQrStorageError) throw err;
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('space') || message.includes('storage') || message.includes('disk')) {
        throw new MessQrStorageError('storage_full', 'Not enough storage space to save this image.');
      }
      throw new MessQrStorageError('unknown', 'Could not save the image. Please try again.');
    }
  }

  async clear(): Promise<void> {
    const existing = await this.get();
    if (existing?.imagePath) {
      await FileSystem.deleteAsync(existing.imagePath, { idempotent: true });
    }
    await this.save(null);
  }
}

export const messQrStore: MessQrStore = new LocalMessQrStore();
