import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  dateBadge,
  formatTimeRange,
  reminderTitle,
  splitReminders,
  type Reminder,
} from '@/reminders/reminderLogic';
import { useReminders } from '@/reminders/reminderStore';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

/** Screen 02 — today's reminders, then upcoming ones, with "+ Add New" pinned at the bottom. */
export default function ReminderListScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { reminders, ready } = useReminders();
  const [now, setNow] = useState(() => new Date());

  // Re-sort into Today / Upcoming whenever the screen is shown and as the clock moves past midnight.
  useFocusEffect(useCallback(() => setNow(new Date()), []));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const sections = useMemo(() => {
    const { today, upcoming } = splitReminders(reminders, now);
    return [
      { key: 'today', title: null as string | null, empty: 'No reminders for today.', data: today },
      { key: 'upcoming', title: 'Upcoming Reminders', empty: 'Nothing coming up.', data: upcoming },
    ];
  }, [reminders, now]);

  const renderItem = ({ item }: { item: Reminder }) => {
    const badge = dateBadge(item, now);
    const isToday = badge === 'Today';
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${reminderTitle(item)}, ${badge}, ${formatTimeRange(item)}`}
      >
        <View style={styles.rowText}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {reminderTitle(item)}
          </Text>
          <Text style={[styles.time, { color: theme.textMuted }]}>{formatTimeRange(item)}</Text>
        </View>
        <View
          style={[
            styles.badge,
            isToday
              ? { backgroundColor: theme.highlight, borderColor: theme.highlight }
              : { backgroundColor: 'transparent', borderColor: theme.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: isToday ? theme.onHighlight : theme.text }]}>{badge}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {!ready ? (
        <ActivityIndicator style={styles.loading} color={theme.linkText} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
                {section.title}
              </Text>
            ) : null
          }
          renderSectionFooter={({ section }) => (
            <>
              {section.data.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textMuted }]}>{section.empty}</Text>
              ) : null}
              {section.key === 'today' ? (
                <View style={[styles.sectionRule, { backgroundColor: theme.border }]} />
              ) : null}
            </>
          )}
        />
      )}

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Pressable
          onPress={() => router.push('/reminders/new')}
          accessibilityRole="button"
          accessibilityLabel="Add new reminder"
          style={({ pressed }) => [styles.addButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="add" size={22} color={theme.onPrimary} />
          <Text style={[styles.addText, { color: theme.onPrimary }]}>Add New</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenMargin,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 72,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  title: {
    ...AppTypography.bodyHeader,
  },
  time: {
    ...AppTypography.bodySmall,
  },
  badge: {
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    justifyContent: 'center',
  },
  badgeText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    ...AppTypography.h2,
    paddingTop: spacing.md,
  },
  sectionRule: {
    height: 1,
    marginTop: spacing.sm,
  },
  empty: {
    ...AppTypography.body,
    paddingVertical: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.screenMargin,
    paddingTop: spacing.sm,
  },
  addButton: {
    minHeight: 56,
    borderRadius: AppRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addText: {
    ...AppTypography.button,
  },
  pressed: {
    opacity: 0.85,
  },
});
