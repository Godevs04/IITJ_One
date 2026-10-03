import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';

export type HomeSectionKey =
  | 'transport'
  | 'nextClass'
  | 'messMenu'
  | 'messQr'
  | 'directories'
  | 'services'
  | 'discover'
  | 'events'
  | 'notices';

export const HOME_SECTIONS: { key: HomeSectionKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'transport', label: 'Next bus', icon: 'bus-outline' },
  { key: 'nextClass', label: 'Next class', icon: 'school-outline' },
  { key: 'messMenu', label: "Today's mess menu", icon: 'restaurant-outline' },
  { key: 'messQr', label: 'Mess QR', icon: 'qr-code-outline' },
  { key: 'directories', label: 'Health & Campus Directory', icon: 'medkit-outline' },
  { key: 'services', label: 'Institute services', icon: 'grid-outline' },
  { key: 'discover', label: 'Discover', icon: 'compass-outline' },
  { key: 'events', label: 'Upcoming events', icon: 'calendar-outline' },
  { key: 'notices', label: 'Important notices', icon: 'megaphone-outline' },
];

export interface HomeLayout {
  order: HomeSectionKey[];
  hidden: HomeSectionKey[];
}

const STORAGE_KEY = 'home_layout_v1';
const ALL_KEYS = HOME_SECTIONS.map((s) => s.key);
export const DEFAULT_HOME_LAYOUT: HomeLayout = { order: ALL_KEYS, hidden: [] };

/** Drops unknown keys and appends sections added in later app versions, so old saved layouts never hide new features. */
function normalise(layout: Partial<HomeLayout> | null): HomeLayout {
  const order = (layout?.order ?? []).filter((k): k is HomeSectionKey => ALL_KEYS.includes(k as HomeSectionKey));
  for (const key of ALL_KEYS) if (!order.includes(key)) order.push(key);
  const hidden = (layout?.hidden ?? []).filter((k): k is HomeSectionKey => ALL_KEYS.includes(k as HomeSectionKey));
  return { order, hidden };
}

let current: HomeLayout = DEFAULT_HOME_LAYOUT;
let loaded: Promise<void> | null = null;
const listeners = new Set<(layout: HomeLayout) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      current = normalise(raw ? JSON.parse(raw) : null);
      listeners.forEach((l) => l(current));
    })
    .catch(() => undefined);
  return loaded;
}

export async function saveHomeLayout(layout: HomeLayout): Promise<void> {
  current = normalise(layout);
  listeners.forEach((l) => l(current));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save home layout', e);
  }
}

/** Shared across Home and the Customize screen, so edits show on Home immediately. */
export function useHomeLayout(): HomeLayout {
  const [layout, setLayout] = useState(current);
  useEffect(() => {
    listeners.add(setLayout);
    void load().then(() => setLayout(current));
    return () => {
      listeners.delete(setLayout);
    };
  }, []);
  return layout;
}
