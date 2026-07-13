import { useCallback, useEffect, useMemo, useState } from 'react';
import { readCachedModule } from '@/services/sync';
import type { CalendarDoc, TransportDoc } from '@/types/campus';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useSwipeGesture } from '@/navigation/SwipeContext';
import { getTripsWithStatus } from '@/transport/services/ScheduleEngine';
import { TransportScreenView } from '@/transport/ui/TransportScreenView';
import { CampusMapScreen } from '@/transport/ui/CampusMapScreen';

export default function TransportScreen() {
  const { syncing, sync } = useCampusSync(false);
  const transport = readCachedModule<TransportDoc>('transport');
  const calendar = readCachedModule<CalendarDoc>('calendar');
  const { lockSwipe, unlockSwipe } = useSwipeGesture();

  const [tick, setTick] = useState(0);
  const [showMap, setShowMap] = useState(false);

  // The embedded map has its own pan/zoom gestures — don't let the tab
  // pager fight it for horizontal swipes while it's on screen.
  useEffect(() => {
    if (!showMap) return undefined;
    lockSwipe();
    return () => unlockSwipe();
  }, [showMap, lockSwipe, unlockSwipe]);

  // Trigger recalculation of active/upcoming status countdowns periodically (every 10s)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const tripsWithStatus = useMemo(() => {
    return getTripsWithStatus(transport, calendar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, calendar, tick]);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  if (showMap) {
    return (
      <CampusMapScreen
        tripsWithStatus={tripsWithStatus}
        onBack={() => setShowMap(false)}
      />
    );
  }

  return (
    <TransportScreenView
      transport={transport}
      calendar={calendar}
      tick={tick}
      onOpenMap={() => setShowMap(true)}
      onRefresh={onRefresh}
      refreshing={syncing}
    />
  );
}
