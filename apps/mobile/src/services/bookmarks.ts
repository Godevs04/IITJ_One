import { useEffect, useState } from 'react';
import { getSetting, setSetting } from './cache';

/**
 * Campaign bookmarks — architecture only (Phase 4). Local-only, no backend
 * persistence yet: no server sync, no cross-device support, no dedicated
 * "My Bookmarks" screen. Just the read/write/subscribe primitives a future
 * phase can build a real bookmarks list on top of without redesigning
 * anything here.
 */

const BOOKMARKS_KEY = 'discover:bookmarkedCampaignIds';

const listeners = new Set<() => void>();

function getIds(): string[] {
  return getSetting<string[]>(BOOKMARKS_KEY, []);
}

function notify(): void {
  listeners.forEach((l) => l());
}

export function isBookmarked(campaignId: string): boolean {
  return getIds().includes(campaignId);
}

export function toggleBookmark(campaignId: string): boolean {
  const ids = getIds();
  const idx = ids.indexOf(campaignId);
  const next = idx >= 0 ? ids.filter((id) => id !== campaignId) : [...ids, campaignId];
  setSetting(BOOKMARKS_KEY, next);
  notify();
  return idx < 0;
}

export function getBookmarkedIds(): string[] {
  return getIds();
}

/** Re-renders the calling component whenever any bookmark changes anywhere in the app. */
export function useBookmark(campaignId: string | undefined): { bookmarked: boolean; toggle: () => void } {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    bookmarked: campaignId ? isBookmarked(campaignId) : false,
    toggle: () => {
      if (campaignId) toggleBookmark(campaignId);
    },
  };
}
