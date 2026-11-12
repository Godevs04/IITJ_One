import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder } from './reminderLogic';

/**
 * The single source of reminders for Home, the Reminder List and New Reminder.
 *
 * Reminders live on this device: IITJ One has no student accounts yet. Everything goes through
 * `reminderStore`, so moving to server storage later means replacing this file, not its callers.
 */
const STORAGE_KEY = 'reminders_v1';

let current: Reminder[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<(reminders: Reminder[]) => void>();

function isReminder(value: unknown): value is Reminder {
  const r = value as Reminder | null;
  return !!r && typeof r.id === 'string' && typeof r.memo === 'string' && typeof r.scheduledAt === 'string';
}

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      current = Array.isArray(parsed) ? parsed.filter(isReminder) : [];
      listeners.forEach((l) => l(current));
    })
    .catch((e) => {
      console.warn('Failed to load reminders', e);
    });
  return loaded;
}

/** Writes first and only then updates what the app shows, so a failed save is never reported as saved. */
async function persist(next: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  current = next;
  listeners.forEach((l) => l(current));
}

export const reminderStore = {
  async list(): Promise<Reminder[]> {
    await load();
    return current;
  },
  /** Rejects if the reminder could not be written. */
  async add(reminder: Reminder): Promise<void> {
    await load();
    await persist([...current, reminder]);
  },
  async remove(id: string): Promise<void> {
    await load();
    await persist(current.filter((r) => r.id !== id));
  },
};

/** Live reminders; `ready` is false until the first read from storage finishes. */
export function useReminders(): { reminders: Reminder[]; ready: boolean } {
  const [state, setState] = useState({ reminders: current, ready: false });
  useEffect(() => {
    const onChange = (reminders: Reminder[]) => setState({ reminders, ready: true });
    listeners.add(onChange);
    void load().then(() => onChange(current));
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return state;
}
