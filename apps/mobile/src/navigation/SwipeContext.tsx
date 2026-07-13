import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface SwipeContextValue {
  swipeEnabled: boolean;
  /** Increment/decrement a lock count so nested consumers can't re-enable a lock held by another. */
  lockSwipe: () => void;
  unlockSwipe: () => void;
}

const SwipeContext = createContext<SwipeContextValue>({
  swipeEnabled: true,
  lockSwipe: () => {},
  unlockSwipe: () => {},
});

export function SwipeProvider({ children }: { children: ReactNode }) {
  const lockCount = useRef(0);
  const [swipeEnabled, setSwipeEnabled] = useState(true);

  const lockSwipe = useCallback(() => {
    lockCount.current += 1;
    if (swipeEnabled) setSwipeEnabled(false);
  }, [swipeEnabled]);

  const unlockSwipe = useCallback(() => {
    lockCount.current = Math.max(0, lockCount.current - 1);
    if (lockCount.current === 0) setSwipeEnabled(true);
  }, []);

  const value = useMemo(
    () => ({ swipeEnabled, lockSwipe, unlockSwipe }),
    [swipeEnabled, lockSwipe, unlockSwipe],
  );

  return <SwipeContext.Provider value={value}>{children}</SwipeContext.Provider>;
}

/** Read/lock the tab pager's swipe gesture. Use lockSwipe/unlockSwipe around any nested horizontal gesture (WebView pan, horizontal ScrollView drag) so it doesn't fight the tab swipe. */
export function useSwipeGesture() {
  return useContext(SwipeContext);
}
