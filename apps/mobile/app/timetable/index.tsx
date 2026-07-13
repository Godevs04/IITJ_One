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
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function TimetableScreen() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(todayDayShort());

  const load = useCallback(async () => {
    setEntries(await listTimetableEntries());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dayClasses = getClassesForDay(entries, selectedDay);

  return (
    <ScreenShell title="My Timetable" subtitle="Stored only on this device">
      <View style={styles.dayStrip}>
        {DAYS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setSelectedDay(d)}
            style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}
          >
            <Text
              style={[
                styles.dayChipText,
                selectedDay === d && styles.dayChipTextActive,
              ]}
            >
              {d.toUpperCase()}
            </Text>
          </Pressable>
        ))}
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
    borderColor: AppColors.borderNeutral,
  },
  dayChipActive: {
    backgroundColor: AppColors.indigoTint,
    borderColor: AppColors.jodhpurIndigo,
  },
  dayChipText: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
  },
  dayChipTextActive: {
    color: AppColors.jodhpurIndigo,
    fontWeight: '600',
  },
});
