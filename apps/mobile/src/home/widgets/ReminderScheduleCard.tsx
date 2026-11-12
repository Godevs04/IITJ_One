import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { listTimetableEntries, type TimetableEntry } from '@/services/localDb';
import {
  formatClock,
  formatHomeDate,
  formatTimeRange,
  reminderTitle,
  splitReminders,
  todaySummary,
} from '@/reminders/reminderLogic';
import { useReminders } from '@/reminders/reminderStore';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';
import { parseTimeToMinutes } from '@/utils/date';
import { getClassesForDay } from '@/utils/timetable';

const DAY_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MAX_ITEMS = 3;

interface ScheduleItem {
  key: string;
  title: string;
  time: string;
  startMinutes: number;
  route: '/reminders' | '/timetable';
}

/**
 * Home's first card (Screen 01 §4): today's date with the day's reminder summary on the left, and today's
 * schedule — timetable classes and reminders together, in time order — on the right, with "+" to add one.
 */
export function ReminderScheduleCard({ now }: { now: Date }) {
  const theme = useThemeColors();
  const { reminders, ready } = useReminders();
  const [classes, setClasses] = useState<TimetableEntry[]>([]);

  // The timetable is edited on another screen, so re-read it whenever Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listTimetableEntries()
        .then((entries) => {
          if (active) setClasses(entries);
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  const { today } = useMemo(() => splitReminders(reminders, now), [reminders, now]);

  const schedule = useMemo<ScheduleItem[]>(() => {
    const fromClasses = getClassesForDay(classes, DAY_SHORT[now.getDay()]).map((c) => {
      const start = parseTimeToMinutes(c.startTime);
      return {
        key: `class-${c.id}`,
        title: c.className,
        time: `${formatClock(start)} – ${formatClock(parseTimeToMinutes(c.endTime))}`,
        startMinutes: start,
        route: '/timetable' as const,
      };
    });
    const fromReminders = today.map((r) => {
      const at = new Date(r.scheduledAt);
      return {
        key: `reminder-${r.id}`,
        title: reminderTitle(r),
        time: formatTimeRange(r),
        startMinutes: at.getHours() * 60 + at.getMinutes(),
        route: '/reminders' as const,
      };
    });
    return [...fromClasses, ...fromReminders].sort((a, b) => a.startMinutes - b.startMinutes);
  }, [classes, today, now]);

  // Lead with what is still ahead today; once everything has passed, show the day's last items.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const ahead = schedule.filter((item) => item.startMinutes >= nowMinutes);
  const shown = (ahead.length > 0 ? ahead : schedule.slice(-MAX_ITEMS)).slice(0, MAX_ITEMS);
  const hiddenCount = schedule.length - shown.length;

  const { date, weekday } = formatHomeDate(now);
  const summary = ready ? todaySummary(today) : ' ';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        onPress={() => router.push('/reminders')}
        accessibilityRole="button"
        accessibilityLabel={`${date}, ${weekday}. ${summary}. Open reminders`}
        style={({ pressed }) => [styles.dateBlock, { borderColor: theme.border }, pressed && styles.pressed]}
      >
        <View style={styles.dateText}>
          <Text style={[styles.date, { color: theme.text }]}>{date},</Text>
          <Text style={[styles.weekday, { color: theme.text }]}>{weekday}</Text>
        </View>
        <View
          style={[
            styles.summary,
            { backgroundColor: today.length > 0 ? theme.highlight : theme.surfaceMuted },
          ]}
        >
          <Text
            style={[styles.summaryText, { color: today.length > 0 ? theme.onHighlight : theme.textMuted }]}
            numberOfLines={2}
          >
            {summary}
          </Text>
        </View>
      </Pressable>

      <View style={styles.schedule}>
        <View style={styles.items}>
          {shown.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>Nothing scheduled today.</Text>
          ) : (
            shown.map((item, i) => (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.route)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.time}`}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.itemTime, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.time}
                </Text>
              </Pressable>
            ))
          )}
          {hiddenCount > 0 ? (
            <Text style={[styles.more, { color: theme.textMuted }]}>+{hiddenCount} more today</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/reminders/new')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add a reminder"
          style={({ pressed }) => [styles.add, { borderColor: theme.text }, pressed && styles.pressed]}
        >
          <MaterialIcons name="add" size={24} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: AppRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  dateBlock: {
    width: '40%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: AppRadius.md,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  dateText: {
    padding: spacing.sm,
  },
  date: {
    ...AppTypography.h2,
  },
  weekday: {
    ...AppTypography.body,
  },
  summary: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  summaryText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  schedule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  items: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  item: {
    paddingVertical: spacing.sm,
  },
  itemTitle: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemTime: {
    ...AppTypography.bodySmall,
  },
  empty: {
    ...AppTypography.bodySmall,
  },
  more: {
    ...AppTypography.small,
    paddingTop: spacing.xs,
  },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
