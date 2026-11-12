import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import type { Icon } from '@/components/Icon';

/**
 * Registry of services that can be pinned to Home's Services grid, plus the user's own selection.
 * Home renders from this list, so adding a service here makes it available to pin — no screen edits.
 *
 * The selection is stored on this device (IITJ One has no student accounts yet); everything goes through
 * saveHomeServices / useHomeServices so it can move to server storage later.
 */
export interface HomeService {
  key: string;
  label: string;
  icon: keyof typeof Icon.glyphMap;
  route: Href;
  /** Pinned to Home until the user changes their selection. */
  defaultOnHome?: boolean;
}

export const HOME_SERVICES = [
  // Quick Links opens Essential Portals until the Quick Links & Services Directory (Screen 07) is built.
  { key: 'quickLinks', label: 'Quick Links', icon: 'link-outline', route: '/portals', defaultOnHome: true },
  { key: 'eventsClubs', label: 'Events & Clubs', icon: 'megaphone-outline', route: '/discover', defaultOnHome: true },
  { key: 'cabAuto', label: 'Cab / Auto', icon: 'car-outline', route: '/cabs-autos', defaultOnHome: true },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', route: '/timetable', defaultOnHome: true },
  { key: 'notes', label: 'Notes', icon: 'document-text-outline', route: '/notes' },
  { key: 'laundry', label: 'Laundry', icon: 'shirt-outline', route: '/laundry' },
  { key: 'wifi', label: 'Internet & Wi-Fi', icon: 'wifi-outline', route: '/wifi' },
  { key: 'eRickshaw', label: 'E-Rickshaw', icon: 'car-sport-outline', route: '/e-rickshaw' },
  { key: 'campusServices', label: 'Campus Services', icon: 'construct-outline', route: '/services' },
  { key: 'calendar', label: 'Academic Calendar', icon: 'calendar-outline', route: '/calendar' },
  { key: 'directory', label: 'Campus Directory', icon: 'people-outline', route: '/campus-directory' },
  { key: 'apps', label: 'Campus Apps', icon: 'apps-outline', route: '/apps' },
] as const satisfies readonly HomeService[];

export type HomeServiceKey = (typeof HOME_SERVICES)[number]['key'];

export interface HomeServicesLayout {
  /** Every known service, in the user's order. */
  order: HomeServiceKey[];
  /** Services not shown on Home. */
  hidden: HomeServiceKey[];
}

const STORAGE_KEY = 'home_services_v1';
const ALL_KEYS: HomeServiceKey[] = HOME_SERVICES.map((s) => s.key);
const isKey = (k: unknown): k is HomeServiceKey => ALL_KEYS.includes(k as HomeServiceKey);

export const DEFAULT_HOME_SERVICES: HomeServicesLayout = {
  order: ALL_KEYS,
  hidden: HOME_SERVICES.filter((s) => !('defaultOnHome' in s && s.defaultOnHome)).map((s) => s.key),
};

/** Drops unknown keys; services added in a later app version join the end of the list, unpinned. */
function normalise(layout: Partial<HomeServicesLayout> | null): HomeServicesLayout {
  if (!layout) return DEFAULT_HOME_SERVICES;
  const order = (layout.order ?? []).filter(isKey);
  const hidden = (layout.hidden ?? []).filter(isKey);
  for (const key of ALL_KEYS) {
    if (!order.includes(key)) {
      order.push(key);
      hidden.push(key);
    }
  }
  return { order, hidden };
}

let current: HomeServicesLayout = DEFAULT_HOME_SERVICES;
let loaded: Promise<void> | null = null;
const listeners = new Set<(layout: HomeServicesLayout) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      current = normalise(raw ? JSON.parse(raw) : null);
      listeners.forEach((l) => l(current));
    })
    .catch(() => undefined);
  return loaded;
}

export async function saveHomeServices(layout: HomeServicesLayout): Promise<void> {
  current = normalise(layout);
  listeners.forEach((l) => l(current));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save home services', e);
  }
}

/** Shared by Home and the Customize screen, so edits show on Home immediately. */
export function useHomeServices(): HomeServicesLayout {
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

/** The pinned services, in order — what Home's grid shows. */
export function pinnedServices(layout: HomeServicesLayout): HomeService[] {
  const hidden = new Set(layout.hidden);
  return layout.order
    .filter((key) => !hidden.has(key))
    .map((key) => HOME_SERVICES.find((s) => s.key === key))
    .filter((s): s is (typeof HOME_SERVICES)[number] => s != null);
}
