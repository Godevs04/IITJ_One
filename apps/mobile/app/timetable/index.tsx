import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { listTimetableEntries, type TimetableEntry } from '@/services/localDb';
import { formatClock, formatLongDate, hasSourceReminder, localDateKey } from '@/reminders/reminderLogic';
import { useReminders } from '@/reminders/reminderStore';
import {
  PIXELS_PER_HOUR,
  addDays,
  hourLabels,
  layoutBlocks,
  nowOffset,
  timelineRange,
  weekChips,
} from '@/timetable/timelineLogic';
import { getClassesForDay } from '@/utils/timetable';
import { parseTimeToMinutes } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

const LABEL_WIDTH = 72;
const BLOCK_GAP = 4;

interface ClassBlock {
  entry: TimetableEntry;
  startMin: number;
  endMin: number;
}

/** Screen 14 — the day's classes on a 6 AM–8 PM grid, each block placed and sized by its own start and end time. */
export default function TimetableScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { reminders } = useReminders();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [details, setDetails] = useState<ClassBlock | null>(null);
  const [areaWidth, setAreaWidth] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const scrolledFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEntries(await listTimetableEntries());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);
  // Classes are edited on another screen, so re-read them each time this one is shown.
  useFocusEffect(
    useCallback(() => {
      void load();
      setNow(new Date());
    }, [load]),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const chips = useMemo(() => weekChips(selected), [selected]);
  const selectedKey = localDateKey(selected);
  const todayKey = localDateKey(now);
  const chip = chips.find((c) => c.key === selectedKey) ?? chips[0];

  const blocks = useMemo<ClassBlock[]>(
    () =>
      getClassesForDay(entries, chip.dayShort)
        .map((entry) => ({ entry, startMin: parseTimeToMinutes(entry.startTime), endMin: parseTimeToMinutes(entry.endTime) }))
        .filter((b) => b.endMin > b.startMin),
    [entries, chip.dayShort],
  );
  const range = useMemo(
    () => timelineRange(blocks.map((b) => ({ id: b.entry.id, startMin: b.startMin, endMin: b.endMin }))),
    [blocks],
  );
  const layout = useMemo(
    () => layoutBlocks(blocks.map((b) => ({ id: b.entry.id, startMin: b.startMin, endMin: b.endMin })), range.startHour),
    [blocks, range.startHour],
  );
  const labels = hourLabels(range.startHour, range.endHour);
  const gridHeight = (range.endHour - range.startHour) * PIXELS_PER_HOUR;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = selectedKey === todayKey;
  const nowTop = isToday ? nowOffset(nowMin, range.startHour, range.endHour) : null;

  // Bring the first class (or the current time) into view once per day shown.
  useEffect(() => {
    if (!loaded || scrolledFor.current === selectedKey) return;
    scrolledFor.current = selectedKey;
    const target = layout[0]?.top ?? nowTop ?? 0;
    scroller.current?.scrollTo({ y: Math.max(0, target - PIXELS_PER_HOUR / 2), animated: false });
  }, [loaded, selectedKey, layout, nowTop]);

  const reminderId = (b: ClassBlock) => `${b.entry.id}:${selectedKey}`;
  const hasReminder = (b: ClassBlock) => hasSourceReminder(reminders, 'timetable', reminderId(b));
  // A class whose start has already passed can't be reminded about (reminders are for the future).
  const isPast = (b: ClassBlock) => selectedKey < todayKey || (selectedKey === todayKey && b.startMin <= nowMin);

  const openReminder = (b: ClassBlock) => {
    if (hasReminder(b)) {
      router.push('/reminders');
      return;
    }
    router.push({
      pathname: '/reminders/new',
      params: {
        memo: b.entry.className,
        date: selectedKey,
        start: String(b.startMin),
        end: String(b.endMin),
        sourceType: 'timetable',
        sourceId: reminderId(b),
      },
    });
  };

  const onAreaLayout = (e: LayoutChangeEvent) => setAreaWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Time Table',
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/timetable/add', params: { day: chip.dayShort } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add new class"
              style={({ pressed }) => [styles.addNew, { backgroundColor: theme.primary }, pressed && styles.pressed]}
            >
              <MaterialIcons name="add" size={18} color={theme.onPrimary} />
              <Text style={[styles.addNewText, { color: theme.onPrimary }]}>Add New</Text>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.chipRow, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setSelected(addDays(selected, -7))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          style={styles.weekArrow}
        >
          <MaterialIcons name="chevron-left" size={24} color={theme.text} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((c) => {
            const active = c.key === selectedKey;
            return (
              <Pressable
                key={c.key}
                onPress={() => setSelected(c.date)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${formatLongDate(c.date)}${c.key === todayKey ? ', today' : ''}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.chipActiveBackground : theme.chipBackground,
                    borderColor: active ? theme.chipActiveBackground : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipWeekday, { color: active ? theme.chipActiveText : theme.textMuted }]}>{c.weekday}</Text>
                <Text style={[styles.chipDay, { color: active ? theme.chipActiveText : theme.text }]}>{c.day}</Text>
                {c.key === todayKey ? <View style={[styles.todayDot, { backgroundColor: active ? theme.chipActiveText : theme.linkText }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => setSelected(addDays(selected, 7))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next week"
          style={styles.weekArrow}
        >
          <MaterialIcons name="chevron-right" size={24} color={theme.text} />
        </Pressable>
      </View>

      {loadError ? (
        <Pressable
          onPress={() => void load()}
          accessibilityRole="button"
          style={[styles.banner, { backgroundColor: theme.errorTint }]}
        >
          <MaterialIcons name="error-outline" size={18} color={theme.error} />
          <Text style={[styles.bannerText, { color: theme.error }]}>Could not load your timetable. Tap to retry.</Text>
        </Pressable>
      ) : null}

      {loaded && layout.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>No classes this day. Tap Add New to build your schedule.</Text>
      ) : null}

      <ScrollView ref={scroller} contentContainerStyle={{ padding: spacing.screenMargin, paddingBottom: insets.bottom + spacing.xl }}>
        <View style={{ height: gridHeight + 24 }}>
          {labels.map((l) => (
            <View key={l.hour} style={[styles.hourRow, { top: l.top }]} pointerEvents="none">
              <Text style={[styles.hourLabel, { color: theme.textMuted }]}>{l.label}</Text>
              <View style={[styles.hourLine, { backgroundColor: theme.border }]} />
            </View>
          ))}

          <View style={styles.blocksArea} onLayout={onAreaLayout}>
            {nowTop != null ? (
              <View style={[styles.nowLine, { top: nowTop, backgroundColor: theme.error }]} pointerEvents="none" />
            ) : null}
            {layout.map((l) => {
              const b = blocks.find((x) => x.entry.id === l.id)!;
              const colWidth = (areaWidth - BLOCK_GAP * (l.columns - 1)) / l.columns;
              const past = isPast(b);
              const set = hasReminder(b);
              return (
                <View
                  key={l.id}
                  style={{ position: 'absolute', top: l.top, height: l.height, left: l.column * (colWidth + BLOCK_GAP), width: Math.max(0, colWidth) }}
                >
                  <Pressable
                    onPress={() => setDetails(b)}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.entry.className}, ${formatClock(b.startMin)} to ${formatClock(b.endMin)}. Show details`}
                    style={({ pressed }) => [
                      styles.block,
                      { backgroundColor: theme.primaryTint, borderColor: theme.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.blockTitle, { color: theme.text }]} numberOfLines={2}>{b.entry.className}</Text>
                    <Text style={[styles.blockTime, { color: theme.textMuted }]} numberOfLines={1}>
                      {formatClock(b.startMin)} – {formatClock(b.endMin)}
                    </Text>
                  </Pressable>
                  {/* A sibling of the block, so tapping Reminder never opens the details. */}
                  {l.height >= 64 ? (
                    <Pressable
                      onPress={() => openReminder(b)}
                      disabled={past && !set}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={set ? `Reminder set for ${b.entry.className}. View reminders` : `Set reminder for ${b.entry.className}`}
                      accessibilityState={{ disabled: past && !set }}
                      style={[styles.reminder, { opacity: past && !set ? 0.4 : 1 }]}
                    >
                      <MaterialIcons name={set ? 'notifications-active' : 'notifications-none'} size={16} color={theme.linkText} />
                      <Text style={[styles.reminderText, { color: theme.linkText }]}>{set ? 'Reminder set' : 'Reminder'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal visible={details != null} transparent animationType="fade" onRequestClose={() => setDetails(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetails(null)} accessibilityLabel="Close" />
          {details ? (
            <View style={[styles.sheet, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
              <Text style={[styles.sheetTitle, { color: theme.text }]} accessibilityRole="header">{details.entry.className}</Text>
              <DetailRow icon="event" text={formatLongDate(selected)} />
              <DetailRow icon="schedule" text={`${formatClock(details.startMin)} – ${formatClock(details.endMin)}`} />
              <DetailRow icon="school" text={details.entry.classType[0].toUpperCase() + details.entry.classType.slice(1)} />
              {details.entry.room ? <DetailRow icon="place" text={details.entry.room} /> : null}
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => {
                    const id = details.entry.id;
                    setDetails(null);
                    router.push(`/timetable/add?id=${id}`);
                  }}
                  accessibilityRole="button"
                  style={styles.sheetAction}
                >
                  <MaterialIcons name="edit" size={18} color={theme.linkText} />
                  <Text style={[styles.sheetActionText, { color: theme.linkText }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => setDetails(null)} accessibilityRole="button" style={styles.sheetAction}>
                  <Text style={[styles.sheetActionText, { color: theme.textMuted }]}>Close</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  const theme = useThemeColors();
  return (
    <View style={styles.detailRow}>
      <MaterialIcons name={icon} size={20} color={theme.textMuted} />
      <Text style={[styles.detailText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    borderRadius: AppRadius.full,
  },
  addNewText: { ...AppTypography.bodySmall, fontWeight: '700' },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekArrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: spacing.sm, paddingRight: spacing.sm },
  chip: {
    width: 56,
    minHeight: 60,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  chipWeekday: { ...AppTypography.small, fontWeight: '700', letterSpacing: 0.4 },
  chipDay: { ...AppTypography.bodyHeader, fontWeight: '700' },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.screenMargin,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: AppRadius.md,
  },
  bannerText: { ...AppTypography.bodySmall, flex: 1 },
  hourRow: { position: 'absolute', left: 0, right: 0, height: 20, flexDirection: 'row', alignItems: 'center' },
  hourLabel: { ...AppTypography.bodySmall, width: LABEL_WIDTH - 8 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  blocksArea: { position: 'absolute', top: 10, bottom: 0, left: LABEL_WIDTH, right: 0 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2 },
  empty: { ...AppTypography.body, paddingHorizontal: spacing.screenMargin, paddingTop: spacing.md },
  block: {
    flex: 1,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    paddingBottom: 26,
    overflow: 'hidden',
  },
  blockTitle: { ...AppTypography.bodyHeader },
  blockTime: { ...AppTypography.bodySmall },
  reminder: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.xs,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderText: { ...AppTypography.bodySmall, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.screenMargin, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    borderRadius: AppRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetTitle: { ...AppTypography.h2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  detailText: { ...AppTypography.body, flex: 1 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, paddingTop: spacing.sm },
  sheetAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  sheetActionText: { ...AppTypography.bodyHeader },
  pressed: { opacity: 0.8 },
});
