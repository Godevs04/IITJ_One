import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { CalendarDoc, TransportDoc, HolidaysDoc, TransportAlertsDoc, TemporaryTransportScheduleDoc } from '@/types/campus';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useActiveScheduleException } from '@/hooks/useActiveScheduleException';
import { useLiveTracking } from '@/transport/state/LiveTrackingProvider';
import { TransportScreenView } from '@/transport/ui/TransportScreenView';

export default function TransportScreen() {
  const { syncing, sync } = useCampusSync(false);
  const transport = useCampusModule<TransportDoc>('transport');
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const holidays = useCampusModule<HolidaysDoc>('holidays');
  const alerts = useCampusModule<TransportAlertsDoc>('transportAlerts');
  const tempSchedule = useCampusModule<TemporaryTransportScheduleDoc>('temporaryTransportSchedule');
  const { data: activeException, refetch: refetchException } = useActiveScheduleException();
  const {
    trips: liveTrips,
    loading: liveLoading,
    error: liveError,
    lastUpdated,
    connectionState,
    refresh: refreshLive,
  } = useLiveTracking();

  // Set by the academic calendar's holiday "Bus schedule for this day" link.
  const params = useLocalSearchParams<{ dayType?: string; for?: string }>();
  const requestedDayType = params.dayType === 'sun-holiday' || params.dayType === 'mon-sat' ? params.dayType : undefined;

  const [tick, setTick] = useState(0);

  // Trigger recalculation of active/upcoming status countdowns periodically (every 10s)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // Re-evaluate on app foreground/resume
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setTick((t) => t + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([sync(), refetchException(), refreshLive()]);
  }, [sync, refetchException, refreshLive]);

  return (
    <TransportScreenView
      transport={transport}
      calendar={calendar}
      holidays={holidays}
      alerts={alerts}
      tempSchedule={tempSchedule}
      activeException={activeException}
      tick={tick}
      onRefresh={onRefresh}
      refreshing={syncing}
      liveTrips={liveTrips}
      liveLoading={liveLoading}
      liveError={liveError}
      lastUpdated={lastUpdated}
      connectionState={connectionState}
      requestedDayType={requestedDayType}
      requestedForLabel={typeof params.for === 'string' ? params.for : undefined}
    />
  );
}
