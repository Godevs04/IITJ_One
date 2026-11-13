import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which clubs the user follows and which events they have saved. Stored on this device (IITJ One has no student
 * accounts yet) as sets of ids, shared by every screen so a change shows everywhere at once. Writes go to storage
 * first, so a failed save is never shown as done. Saved events keep only their id: the event itself stays in the feed
 * data, and a saved event that has since been removed there simply no longer appears.
 */
function createIdSetStore(storageKey: string) {
  let current: ReadonlySet<string> = new Set();
  let loaded: Promise<void> | null = null;
  const listeners = new Set<(ids: ReadonlySet<string>) => void>();

  const load = (): Promise<void> => {
    loaded ??= AsyncStorage.getItem(storageKey)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        current = new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
        listeners.forEach((l) => l(current));
      })
      .catch(() => undefined);
    return loaded;
  };

  return {
    /** Adds the id if absent, removes it if present. Rejects (and changes nothing) if it could not be stored. */
    async toggle(id: string): Promise<boolean> {
      await load();
      const next = new Set(current);
      const nowOn = !next.has(id);
      if (nowOn) next.add(id);
      else next.delete(id);
      await AsyncStorage.setItem(storageKey, JSON.stringify([...next]));
      current = next;
      listeners.forEach((l) => l(current));
      return nowOn;
    },
    use(): ReadonlySet<string> {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [ids, setIds] = useState<ReadonlySet<string>>(current);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        listeners.add(setIds);
        void load().then(() => setIds(current));
        return () => {
          listeners.delete(setIds);
        };
      }, []);
      return ids;
    },
  };
}

const follows = createIdSetStore('followed_clubs_v1');
const saved = createIdSetStore('saved_events_v1');

export const toggleClubFollow = follows.toggle;
export const useFollowedClubs = follows.use;
export const toggleSavedEvent = saved.toggle;
export const useSavedEventIds = saved.use;
