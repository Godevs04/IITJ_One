import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import type { Icon } from '@/components/Icon';

/**
 * Registry of campus services: the Quick Links directory (Screen 07) shows the ones in QUICK_LINK_KEYS, and
 * any of them can be pinned to Home's Services grid — the user's own selection is stored alongside.
 * Everything renders from this list, so adding a service here is the only edit needed.
 *
 * External addresses are the institute's own sites, as already published in the app's Essential Portals data.
 * A service with neither a route nor an address is not listed; never guess a URL.
 *
 * The selection is stored on this device (IITJ One has no student accounts yet); everything goes through
 * saveHomeServices / useHomeServices so it can move to server storage later.
 */
export type ServiceDestination = { type: 'internal'; route: Href } | { type: 'external'; url: string };

export interface HomeService {
  key: string;
  label: string;
  icon: keyof typeof Icon.glyphMap;
  destination: ServiceDestination;
  /** Pinned to Home until the user changes their selection. */
  defaultOnHome?: boolean;
}

const internal = (route: Href): ServiceDestination => ({ type: 'internal', route });
const external = (url: string): ServiceDestination => ({ type: 'external', url });

export const HOME_SERVICES = [
  { key: 'quickLinks', label: 'Quick Links', icon: 'link-outline', destination: internal('/quick-links'), defaultOnHome: true },
  { key: 'eventsClubs', label: 'Events & Clubs', icon: 'megaphone-outline', destination: internal('/discover'), defaultOnHome: true },
  { key: 'cabAuto', label: 'Cab / Auto', icon: 'car-outline', destination: internal('/cabs-autos'), defaultOnHome: true },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', destination: internal('/timetable'), defaultOnHome: true },

  // The ten Quick Links, in wireframe order (see QUICK_LINK_KEYS).
  { key: 'linkOfficial', label: 'Official IITJ', icon: 'globe-outline', destination: external('https://iitj.ac.in') },
  { key: 'linkErp', label: 'Academic ERP', icon: 'school-outline', destination: external('https://erp.iitj.ac.in') },
  { key: 'linkMess', label: 'Mess', icon: 'restaurant-outline', destination: internal('/menu') },
  { key: 'linkLibrary', label: 'Library', icon: 'book-outline', destination: external('https://library.iitj.ac.in') },
  // Security and ID Card contacts live in Campus Services (ID Card Cell; Lost & Found / CCTV).
  { key: 'linkSecurity', label: 'Security', icon: 'shield-checkmark-outline', destination: internal({ pathname: '/services', params: { query: 'Lost & Found' } }) },
  { key: 'linkWifi', label: 'Wi-Fi', icon: 'wifi-outline', destination: internal('/wifi') },
  { key: 'linkIdCard', label: 'ID Card & No Dues', icon: 'card-outline', destination: internal({ pathname: '/services', params: { query: 'ID Card' } }) },
  { key: 'linkTransport', label: 'Transport', icon: 'bus-outline', destination: internal('/(tabs)/transport') },
  { key: 'linkPhc', label: 'PHC', icon: 'medkit-outline', destination: internal('/(tabs)/phc') },
  { key: 'linkMoodle', label: 'Moodle', icon: 'laptop-outline', destination: external('https://moodle.iitj.ac.in') },

  { key: 'notes', label: 'Notes', icon: 'document-text-outline', destination: internal('/notes') },
  { key: 'laundry', label: 'Laundry', icon: 'shirt-outline', destination: internal('/laundry') },
  { key: 'eRickshaw', label: 'E-Rickshaw', icon: 'car-sport-outline', destination: internal('/e-rickshaw') },
  { key: 'campusServices', label: 'Campus Services', icon: 'construct-outline', destination: internal('/services') },
  { key: 'calendar', label: 'Academic Calendar', icon: 'calendar-outline', destination: internal('/calendar') },
  { key: 'directory', label: 'Campus Directory', icon: 'people-outline', destination: internal('/campus-directory') },
  { key: 'apps', label: 'Campus Apps', icon: 'apps-outline', destination: internal('/apps') },
] as const satisfies readonly HomeService[];

export type HomeServiceKey = (typeof HOME_SERVICES)[number]['key'];

/** The Quick Links directory (Screen 07), in the order drawn in the wireframe. */
export const QUICK_LINK_KEYS: HomeServiceKey[] = [
  'linkOfficial', 'linkErp', 'linkMess', 'linkLibrary', 'linkSecurity',
  'linkWifi', 'linkIdCard', 'linkTransport', 'linkPhc', 'linkMoodle',
];

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
