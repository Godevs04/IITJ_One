import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which mess menu to show — shared by the Home "Mess Menu" widget and the Mess tab, so changing it in one
 * place changes both. Only the menus the app actually has data for are offered: Jain is added once the
 * published mess data includes a Jain menu.
 */
export type DietPreference = 'veg' | 'nonVeg';

export const DIET_OPTIONS: { key: DietPreference; label: string }[] = [
  { key: 'veg', label: 'Veg' },
  { key: 'nonVeg', label: 'Non-Veg' },
];

const STORAGE_KEY = 'mess_diet_preference_v1';

let current: DietPreference = 'veg';
let loaded: Promise<void> | null = null;
const listeners = new Set<(pref: DietPreference) => void>();

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw === 'veg' || raw === 'nonVeg') current = raw;
      listeners.forEach((l) => l(current));
    })
    .catch(() => undefined);
  return loaded;
}

export function setDietPreference(pref: DietPreference): void {
  current = pref;
  listeners.forEach((l) => l(current));
  AsyncStorage.setItem(STORAGE_KEY, pref).catch((e) => console.warn('Failed to save diet preference', e));
}

export function useDietPreference(): [DietPreference, (pref: DietPreference) => void] {
  const [pref, setPref] = useState(current);
  useEffect(() => {
    listeners.add(setPref);
    void load().then(() => setPref(current));
    return () => {
      listeners.delete(setPref);
    };
  }, []);
  return [pref, setDietPreference];
}
