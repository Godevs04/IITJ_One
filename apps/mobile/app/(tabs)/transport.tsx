import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { CalendarDoc, TransportDoc, HolidaysDoc, TransportAlertsDoc, TemporaryTransportScheduleDoc } from '@/types/campus';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useActiveScheduleException } from '@/hooks/useActiveScheduleException';
import { TransportScreenView } from '@/transport/ui/TransportScreenView';

export default function TransportScreen() {
  const { syncing, sync } = useCampusSync(false);
  const transport = useCampusModule<TransportDoc>('transport');
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const holidays = useCampusModule<HolidaysDoc>('holidays');
  const alerts = useCampusModule<TransportAlertsDoc>('transportAlerts');
  const tempSchedule = useCampusModule<TemporaryTransportScheduleDoc>('temporaryTransportSchedule');
  const { data: activeException, refetch: refetchException } = useActiveScheduleException();

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
    await Promise.all([sync(), refetchException()]);
  }, [sync, refetchException]);

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
    />
  );
}
