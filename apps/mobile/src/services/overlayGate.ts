/**
 * App-wide "something is already covering the screen" signal — reference
 * counted so nested/overlapping overlays don't unlock each other early.
 * Any full-screen Modal/bottom-sheet/dialog can opt in with
 * `useModalOverlayLock(visible)`; consumers that want to defer showing
 * their own overlay (e.g. the feedback prompt) check `isOverlayLocked()`
 * or subscribe via `onOverlayUnlocked`.
 */

import { useEffect } from 'react';

let lockCount = 0;
const unlockListeners = new Set<() => void>();

export function acquireOverlayLock(): void {
  lockCount += 1;
}

export function releaseOverlayLock(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    unlockListeners.forEach((listener) => listener());
  }
}

export function isOverlayLocked(): boolean {
  return lockCount > 0;
}

/** Fires whenever the lock count returns to zero. Returns an unsubscribe function. */
export function onOverlayUnlocked(listener: () => void): () => void {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

/** Drop this into any full-screen Modal/bottom-sheet component: `useModalOverlayLock(visible)`. */
export function useModalOverlayLock(visible: boolean): void {
  useEffect(() => {
    if (!visible) return;
    acquireOverlayLock();
    return () => releaseOverlayLock();
  }, [visible]);
}
