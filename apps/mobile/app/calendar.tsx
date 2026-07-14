import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { CalendarDoc, CalendarEvent } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const FILTERS = ['all', 'holiday', 'exam', 'academic', 'event'] as const;

function formatRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} → ${end}`;
}

export default function CalendarScreen() {
  const theme = useThemeColors();
  const { syncing, sync } = useCampusSync(false);
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const events = useMemo(() => {
    const list = [...(calendar?.events ?? [])];
    list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (filter === 'all') return list;
    return list.filter((e) => e.type.toLowerCase() === filter);
  }, [calendar, filter]);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      title="Academic Calendar"
      subtitle={calendar?.semester || 'Semester events'}
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primaryTint : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? theme.primary : theme.textMuted },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {events.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {events.map((event, index) => (
            <EventRow key={`${event.title}-${index}`} event={event} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="No events"
          message="Pull down to sync the academic calendar."
        />
      )}
    </ScreenShell>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const theme = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.type, { color: theme.primary }]}>
        {event.type.toUpperCase()}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
      <Text style={[styles.dates, { color: theme.textMuted }]}>
        {formatRange(event.startDate, event.endDate)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    ...AppTypography.caption,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    gap: 4,
  },
  type: {
    ...AppTypography.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  dates: {
    ...AppTypography.caption,
  },
});
