import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messQrStore } from '@/services/qrStorage';

/**
 * The user's saved QR codes (Screens 05–06 and "Redeem"). Images are kept in the app's private document
 * directory and the list in AsyncStorage — both on this device, since IITJ One has no student accounts yet.
 * Everything goes through `qrCollection`, so moving to server storage later means replacing this file.
 *
 * The image is stored exactly as picked (no re-compression) so the QR stays scannable, and its contents are
 * never decoded, opened or logged.
 */
export interface SavedQr {
  id: string;
  /** What the user called it; "My QR" when left blank. */
  caption: string;
  /** File name inside the saved-QR directory. The absolute path is resolved at read time (see uriFor). */
  fileName: string;
  width: number;
  height: number;
  addedAt: string;
}

export const CAPTION_MAX_LENGTH = 60;
export const DEFAULT_CAPTION = 'My QR';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const STORAGE_KEY = 'saved_qr_v1';
const MIGRATED_KEY = 'saved_qr_migrated_v1';

export type QrSaveErrorReason = 'invalid_image' | 'too_large' | 'storage_full' | 'unknown';

export class QrSaveError extends Error {
  reason: QrSaveErrorReason;
  constructor(reason: QrSaveErrorReason, message: string) {
    super(message);
    this.name = 'QrSaveError';
    this.reason = reason;
  }
}

const directory = () => `${FileSystem.documentDirectory}saved-qr/`;

/** Absolute location of a saved QR's image on this device. */
export function uriFor(qr: Pick<SavedQr, 'fileName'>): string {
  return `${directory()}${qr.fileName}`;
}

/** Trims the caption and falls back to the default label. */
export function normaliseCaption(caption: string): string {
  return caption.trim().slice(0, CAPTION_MAX_LENGTH) || DEFAULT_CAPTION;
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), (e) => reject(e));
  });
}

/** JPEG starts FF D8 FF (base64 "/9j/"); PNG starts with its 8-byte signature (base64 "iVBORw0KGgo"). */
async function ext(uri: string): Promise<'jpg' | 'png' | null> {
  try {
    const head = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position: 0, length: 8 });
    if (head.startsWith('/9j/')) return 'jpg';
    if (head.startsWith('iVBORw0KGgo')) return 'png';
  } catch {
    /* unreadable → not a valid image */
  }
  return null;
}

let current: SavedQr[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(items: SavedQr[]) => void>();

function isSavedQr(v: unknown): v is SavedQr {
  const q = v as SavedQr | null;
  return !!q && typeof q.id === 'string' && typeof q.fileName === 'string' && typeof q.caption === 'string';
}

async function persist(next: SavedQr[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  current = next;
  listeners.forEach((l) => l(current));
}

/** Brings the single Mess QR from before this feature into the list, once. */
async function migrateLegacy(): Promise<void> {
  if (await AsyncStorage.getItem(MIGRATED_KEY)) return;
  try {
    const legacy = await messQrStore.get();
    if (legacy) {
      await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
      const fileName = `legacy-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: legacy.imagePath, to: `${directory()}${fileName}` });
      current = [
        ...current,
        { id: `legacy-${Date.now()}`, caption: 'Mess QR', fileName, width: legacy.width, height: legacy.height, addedAt: legacy.addedAt },
      ];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
    await AsyncStorage.setItem(MIGRATED_KEY, '1');
  } catch (e) {
    console.warn('Could not bring the existing Mess QR into the list', e);
  }
}

function load(): Promise<void> {
  loaded ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      current = Array.isArray(parsed) ? parsed.filter(isSavedQr) : [];
      await migrateLegacy();
    } catch (e) {
      console.warn('Failed to load saved QR codes', e);
    }
    listeners.forEach((l) => l(current));
  })();
  return loaded;
}

export const qrCollection = {
  async list(): Promise<SavedQr[]> {
    await load();
    return current;
  },

  /**
   * Validates the picked image, copies it into private storage and records it. Rejects with a QrSaveError
   * (nothing is stored) if the file is not a JPEG/PNG, is too large, or cannot be written.
   */
  async add(uri: string, caption: string): Promise<SavedQr> {
    await load();
    const kind = await ext(uri);
    if (!kind) throw new QrSaveError('invalid_image', 'Please choose a JPEG or PNG image.');
    let size: { width: number; height: number };
    try {
      size = await imageSize(uri);
    } catch {
      throw new QrSaveError('invalid_image', 'That file could not be read as an image.');
    }
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (info && info.exists && 'size' in info && info.size > MAX_IMAGE_BYTES) {
      throw new QrSaveError('too_large', 'That image is too large. Choose one under 10 MB.');
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${id}.${kind}`;
    try {
      await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
      await FileSystem.copyAsync({ from: uri, to: `${directory()}${fileName}` });
      const record: SavedQr = { id, caption: normaliseCaption(caption), fileName, ...size, addedAt: new Date().toISOString() };
      await persist([record, ...current]);
      return record;
    } catch (e) {
      await FileSystem.deleteAsync(`${directory()}${fileName}`, { idempotent: true }).catch(() => undefined);
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      if (msg.includes('space') || msg.includes('storage') || msg.includes('disk')) {
        throw new QrSaveError('storage_full', 'Not enough storage space to save this image.');
      }
      throw new QrSaveError('unknown', 'Could not save the QR. Please try again.');
    }
  },

  async remove(id: string): Promise<void> {
    await load();
    const target = current.find((q) => q.id === id);
    await persist(current.filter((q) => q.id !== id));
    if (target) await FileSystem.deleteAsync(uriFor(target), { idempotent: true }).catch(() => undefined);
  },
};

/** The saved QR codes, newest first; `ready` is false until the first read finishes. */
export function useSavedQrs(): { items: SavedQr[]; ready: boolean } {
  const [state, setState] = useState({ items: current, ready: false });
  useEffect(() => {
    const onChange = (items: SavedQr[]) => setState({ items, ready: true });
    listeners.add(onChange);
    void load().then(() => onChange(current));
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return state;
}
