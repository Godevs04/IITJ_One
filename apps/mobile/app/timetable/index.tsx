import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClassCard } from '@/components/ClassCard';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/Buttons';
import { ScreenShell } from '@/components/ScreenShell';
import { listTimetableEntries, type TimetableEntry } from '@/services/localDb';
import { getClassesForDay } from '@/utils/timetable';
import { todayDayShort } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function TimetableScreen() {
  const theme = useThemeColors();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(todayDayShort());
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await listTimetableEntries());
      setLoadError(null);
    } catch {
      setLoadError('Could not load your timetable.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dayClasses = getClassesForDay(entries, selectedDay);

  debugListKeys('TimetableScreen', 'days', DAYS, (day) => day);
  debugListKeys('TimetableScreen', 'dayClasses', dayClasses, (entry) => entry.id);

  return (
    <ScreenShell hideTitle subtitle="Stored only on this device" error={loadError}>
      <View style={styles.dayStrip}>
        {DAYS.map((d) => {
          const active = selectedDay === d;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDay(d)}
              style={[
                styles.dayChip,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active
                    ? theme.chipActiveBackground
                    : theme.chipBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayChipText,
                  { color: active ? theme.chipActiveText : theme.chipText },
                  active && styles.dayChipTextActive,
                ]}
              >
                {d.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="Add class" onPress={() => router.push('/timetable/add')} />

      {dayClasses.length > 0 ? (
        <View style={{ gap: AppSpacing.md }}>
          {dayClasses.map((entry) => (
            <ClassCard
              key={entry.id}
              entry={entry}
              onPress={() => router.push(`/timetable/add?id=${entry.id}`)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="No classes this day"
          message="Tap Add class to build your schedule."
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  dayStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.xs,
  },
  dayChip: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.full,
    borderWidth: 1,
  },
  dayChipText: {
    ...AppTypography.caption,
  },
  dayChipTextActive: {
    fontWeight: '600',
  },
});
