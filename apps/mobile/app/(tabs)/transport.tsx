import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ContentCard } from '@/components/ContentCard';
import { DepartureBoard } from '@/components/DepartureBoard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { CalendarDoc, TransportDoc, TransportTrip } from '@/types/campus';
import { getNextDeparture } from '@/utils/transport';
import { parseTimeToMinutes, nowMinutes } from '@/utils/date';
import { AppColors, AppSpacing, AppTypography } from '@/theme/tokens';

function tripSecondsUntil(trip: TransportTrip): number {
  const diff = parseTimeToMinutes(trip.startTime) - nowMinutes();
  return Math.max(0, diff * 60);
}

export default function TransportScreen() {
  const { syncing, sync } = useCampusSync(false);
  const transport = readCachedModule<TransportDoc>('transport');
  const calendar = readCachedModule<CalendarDoc>('calendar');
  const [tick, setTick] = useState(0);

  const nextBus = useMemo(
    () => getNextDeparture(transport, calendar),
    [transport, calendar, tick],
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const trips = useMemo(() => {
    if (!transport) return [];
    const all = transport.routes.flatMap((g) => g.trips);
    return all
      .map((trip) => ({ trip, seconds: tripSecondsUntil(trip) }))
      .filter((t) => t.seconds > 0)
      .sort((a, b) => a.seconds - b.seconds)
      .slice(0, 8);
  }, [transport, tick]);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      title="Transport"
      subtitle="Campus shuttle schedules"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {nextBus ? (
        <ContentCard
          title="Next departure"
          subtitle={`${nextBus.trip.bus} · ${nextBus.trip.from} → ${nextBus.trip.to}`}
        >
          <DepartureBoard
            label="Departs in"
            totalSeconds={nextBus.secondsUntil}
            blink
            large
          />
          <Text style={styles.route}>{nextBus.trip.route}</Text>
        </ContentCard>
      ) : null}

      {transport?.liveTrackingUrl ? (
        <Pressable
          onPress={() => Linking.openURL(transport.liveTrackingUrl!)}
          style={styles.trackButton}
        >
          <Text style={styles.trackText}>Live tracking</Text>
        </Pressable>
      ) : null}

      {trips.length > 0 ? (
        <View style={{ gap: AppSpacing.md }}>
          <Text style={styles.sectionTitle}>Upcoming trips</Text>
          {trips.map(({ trip, seconds }) => (
            <ContentCard
              key={`${trip.bus}-${trip.startTime}-${trip.from}`}
              title={`${trip.bus} · ${trip.startTime}`}
              subtitle={`${trip.from} → ${trip.to}`}
            >
              <DepartureBoard label="Departs in" totalSeconds={seconds} />
              <Text style={styles.route}>{trip.route}</Text>
            </ContentCard>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="bus-outline"
          title="No schedule loaded"
          message="Pull down to sync transport data."
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...AppTypography.h1,
    color: AppColors.inkSlate,
  },
  route: {
    ...AppTypography.bodySmall,
    color: AppColors.mutedText,
    marginTop: AppSpacing.xs,
  },
  trackButton: {
    backgroundColor: AppColors.indigoTint,
    borderRadius: 12,
    padding: AppSpacing.md,
    alignItems: 'center',
  },
  trackText: {
    ...AppTypography.button,
    color: AppColors.jodhpurIndigo,
  },
});
