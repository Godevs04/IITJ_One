import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { goBack } from '@/navigation/goBack';
import { EmptyState } from '@/components/EmptyState';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { CalendarDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { buildTimeline, initialLocation, monthKey, toDateKey, type DayItem, type MonthOption, type TimelineItem } from '@/calendar/buildTimeline';
import { CALENDAR_FILTERS, toTimelineEvents, type CalendarFilter, type TimelineEvent } from '@/calendar/eventRules';
import { useCalendarProgram } from '@/calendar/programPrefs';
import { buildItemLayout, metrics } from '@/calendar/ui/layout';
import { CarryRow, DayRow, GapRow, MonthHeader } from '@/calendar/ui/TimelineRows';
import { CalendarSettingsSheet, DaySheet, EventDetailSheet, MonthPickerSheet } from '@/calendar/ui/Sheets';
import { OfficialPdfModal } from '@/calendar/ui/OfficialPdfModal';

/**
 * Academic Calendar — timeline (plan: docs/calender/ACADEMIC_CALENDAR_IMPLEMENTATION_PLAN.md §3–7).
 * Reads the synced, normalized calendar module (works offline); unresolved source conflicts never reach
 * this screen (the public API strips them). Only dates that have events render, plus TODAY.
 */
export default function CalendarScreen() {
  const theme = useThemeColors();
  const { fontScale: systemFontScale } = useWindowDimensions();
  const { syncing, sync, error } = useCampusSync(false);
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const { program, setProgram, showPrompt } = useCalendarProgram();

  const [today, setToday] = useState(() => toDateKey(new Date()));
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [detailEvent, setDetailEvent] = useState<TimelineEvent | null>(null);
  const [dayItem, setDayItem] = useState<DayItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<string | null>(null);
  const [todayVisible, setTodayVisible] = useState(true);

  // "Today" rolls over at midnight and when the app returns to the foreground.
  useEffect(() => {
    const refresh = () => setToday(toDateKey(new Date()));
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const events = useMemo(() => toTimelineEvents(calendar?.events), [calendar]);
  const timeline = useMemo(() => buildTimeline(events, today, filter, program), [events, today, filter, program]);
  const m = useMemo(() => metrics(), [systemFontScale]); // eslint-disable-line react-hooks/exhaustive-deps
  const layouts = useMemo(() => buildItemLayout(timeline.sections, m), [timeline, m]);

  const listRef = useRef<SectionList<TimelineItem>>(null);
  // Flat-index position of each section's header in `layouts` (header + items + footer per section).
  const sectionStarts = useMemo(() => {
    const starts: number[] = [];
    let i = 0;
    for (const section of timeline.sections) {
      starts.push(i);
      i += section.data.length + 2;
    }
    return starts;
  }, [timeline]);

  /**
   * Scroll by exact pixel offset from our own computed row layout. scrollToLocation's index arithmetic
   * proved unreliable for animated jumps (the Today button barely moved on web), whereas the offsets are
   * exact by construction — every row has a fixed computed height.
   */
  const scrollToOffset = useCallback((y: number, animated: boolean) => {
    listRef.current?.getScrollResponder()?.scrollTo({ x: 0, y: Math.max(0, y), animated });
  }, []);

  const scrollTo = useCallback(
    (loc: { sectionIndex: number; itemIndex: number }, animated: boolean) => {
      const flat = sectionStarts[loc.sectionIndex] + 1 + loc.itemIndex;
      const layout = layouts[flat];
      if (!layout) return;
      // Leave room for the sticky month header plus a little of the previous row for context.
      scrollToOffset(layout.offset - m.header - 48, animated);
    },
    [sectionStarts, layouts, m.header, scrollToOffset],
  );

  // Open around today (or the nearest end of the data range) once data first arrives, and again when the
  // user changes the filter/program. NOT on every sync tick: useCampusModule returns a fresh object on each
  // sync-engine state change, and re-centring then would yank the list away from where the user scrolled.
  const pendingInitialScroll = useRef(true);
  const hasData = timeline.sections.length > 0;
  useEffect(() => {
    pendingInitialScroll.current = true;
  }, [filter, program, hasData]);
  const onListLayout = useCallback(() => {
    if (!pendingInitialScroll.current) return;
    const loc = initialLocation(timeline, today);
    if (!loc) return;
    pendingInitialScroll.current = false;
    // Run on the next frame OR after a short timer, whichever comes first — frames can be paused (e.g. a
    // backgrounded web view), and opening at today must not depend on frame timing.
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      scrollTo(loc, false);
    };
    requestAnimationFrame(run);
    setTimeout(run, 50);
  }, [timeline, today, scrollTo]);
  useEffect(() => {
    if (pendingInitialScroll.current) onListLayout();
  }, [onListLayout]);

  const todayKeyRef = useRef(`day:${today}`);
  todayKeyRef.current = `day:${today}`;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    // Month of the first visible DAY row — a sliver of the previous month's trailing gap row at the top
    // must not make the header say the wrong month.
    const firstDay = viewableItems.find((v) => (v.item as TimelineItem | undefined)?.kind === 'day');
    const first = firstDay ?? viewableItems.find((v) => v.section);
    if (first?.section) setVisibleMonth((first.section as { key: string }).key);
    setTodayVisible(viewableItems.some((v) => (v.item as TimelineItem | undefined)?.key === todayKeyRef.current));
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;

  const currentMonth = visibleMonth ?? (timeline.today ? timeline.sections[timeline.today.sectionIndex]?.key : null) ?? timeline.sections[0]?.key ?? null;
  const monthLabel = timeline.months.find((x) => x.key === currentMonth)?.label ?? 'Academic Calendar';

  const jumpToMonth = useCallback(
    (month: MonthOption) => {
      setPickerOpen(false);
      if (month.sectionIndex === null) return;
      const header = layouts[sectionStarts[month.sectionIndex]];
      if (header) scrollToOffset(header.offset, true);
    },
    [layouts, sectionStarts, scrollToOffset],
  );

  const goToday = useCallback(() => {
    const loc = initialLocation(timeline, today);
    if (loc) scrollTo(loc, true);
  }, [timeline, today, scrollTo]);

  const sourceLine = calendar && 'source' in calendar && calendar.source
    ? `${calendar.source.publisher}, ${calendar.source.title ?? 'Academic Calendar'} (${calendar.source.documentDate})`
    : null;

  const renderItem = useCallback(
    ({ item }: { item: TimelineItem }) => {
      switch (item.kind) {
        case 'day':
          return <DayRow item={item} m={m} onEventPress={setDetailEvent} onBusPress={setDetailEvent} onMorePress={setDayItem} />;
        case 'gap':
          return <GapRow item={item} m={m} />;
        case 'carry':
          return <CarryRow item={item} m={m} onEventPress={setDetailEvent} />;
      }
    },
    [m],
  );

  const todayDirection =
    timeline.today && currentMonth ? (monthKey(today) < currentMonth ? 'up' : 'down') : 'down';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={goBack}
              hitSlop={10}
              style={({ pressed }) => [{ padding: 8, marginLeft: -8, opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={24} color={theme.headerTint || theme.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.monthButton, { borderColor: theme.border, backgroundColor: theme.surface }, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={`${monthLabel}. Jump to another month`}
          disabled={!timeline.months.length}
        >
          <Text style={[styles.monthButtonText, { color: theme.text }]} numberOfLines={1}>{monthLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={10}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Calendar settings"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {CALENDAR_FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, { backgroundColor: active ? theme.primary : theme.chipBackground, borderColor: active ? theme.primary : theme.border }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? theme.onPrimary : theme.textMuted }]}>{f.label}</Text>
            </Pressable>
          );
        })}
        {program !== 'all' ? (
          <Pressable
            onPress={() => void setProgram('all')}
            style={[styles.chip, styles.programChip, { borderColor: theme.secondary }]}
            accessibilityRole="button"
            accessibilityLabel={`Showing ${program.toUpperCase()} events. Tap to show all`}
          >
            <Text style={[styles.chipText, { color: theme.secondary }]}>Program: {program.toUpperCase()}</Text>
            <Ionicons name="close" size={14} color={theme.secondary} />
          </Pressable>
        ) : null}
      </ScrollView>

      {showPrompt ? (
        <View style={[styles.prompt, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.promptTitle, { color: theme.text }]}>What is your program?</Text>
          <Text style={[styles.promptBody, { color: theme.textMuted }]}>
            Optional. Hides only events the official calendar marks for the other program. Saved on this phone.
          </Text>
          <View style={styles.promptActions}>
            {(['ug', 'pg'] as const).map((p) => (
              <Pressable key={p} onPress={() => void setProgram(p)} style={[styles.promptButton, { backgroundColor: theme.primary }]} accessibilityRole="button">
                <Text style={[styles.promptButtonText, { color: theme.onPrimary }]}>{p.toUpperCase()}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => void setProgram('all')} style={styles.promptSkip} accessibilityRole="button">
              <Text style={[styles.promptSkipText, { color: theme.linkText }]}>Show all</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? (
        <Text style={[styles.syncError, { color: theme.error }]}>Sync issue: {error} — showing saved data.</Text>
      ) : null}

      <SectionList
        ref={listRef}
        sections={timeline.sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <MonthHeader title={section.title} m={m} />}
        stickySectionHeadersEnabled
        getItemLayout={(_data, index) => ({ ...(layouts[index] ?? { length: 0, offset: 0 }), index })}
        onLayout={onListLayout}
        onScrollToIndexFailed={() => {
          setTimeout(() => {
            const loc = initialLocation(timeline, today);
            if (loc) scrollTo(loc, false);
          }, 250);
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => void sync()} tintColor={theme.linkText} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={events.length ? 'Nothing matches this filter' : 'No calendar yet'}
            message={events.length ? 'Try another filter or program.' : 'Pull down to sync the academic calendar.'}
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable onPress={() => setShowPdf(true)} style={styles.pdfLink} accessibilityRole="button">
              <Ionicons name="document-text-outline" size={18} color={theme.linkText} />
              <Text style={[styles.pdfLinkText, { color: theme.linkText }]}>View official PDF calendar</Text>
            </Pressable>
            {sourceLine ? <Text style={[styles.sourceLine, { color: theme.textMuted }]}>Source: {sourceLine}</Text> : null}
          </View>
        }
      />

      {timeline.today && !todayVisible ? (
        <Pressable
          onPress={goToday}
          style={({ pressed }) => [styles.todayPill, { backgroundColor: theme.primary }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Scroll to today"
        >
          <Ionicons name={todayDirection === 'up' ? 'arrow-up' : 'arrow-down'} size={16} color={theme.onPrimary} />
          <Text style={[styles.todayPillText, { color: theme.onPrimary }]}>Today</Text>
        </Pressable>
      ) : null}

      <EventDetailSheet event={detailEvent} onClose={() => setDetailEvent(null)} today={today} sourceLine={sourceLine} />
      <DaySheet
        item={dayItem}
        onClose={() => setDayItem(null)}
        onEventPress={(e) => {
          setDayItem(null);
          setDetailEvent(e);
        }}
      />
      <MonthPickerSheet visible={pickerOpen} months={timeline.months} currentKey={currentMonth} onSelect={jumpToMonth} onClose={() => setPickerOpen(false)} />
      <CalendarSettingsSheet
        visible={settingsOpen}
        program={program}
        onChange={(p) => {
          void setProgram(p);
          setSettingsOpen(false);
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <OfficialPdfModal visible={showPdf} onClose={() => setShowPdf(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  toolbar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.md,
    gap: AppSpacing.md,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 6,
    flexShrink: 1,
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconButton: {
    padding: 4,
  },
  filterScroll: {
    // Never let the list squeeze the chip row (it collapsed to 2px on web without this).
    flexGrow: 0,
    flexShrink: 0,
  },
  filters: {
    gap: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  chip: {
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  programChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  prompt: {
    flexShrink: 0,
    marginHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.sm,
    borderWidth: 1,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  promptTitle: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  promptBody: {
    ...AppTypography.caption,
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.xs,
  },
  promptButton: {
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
  },
  promptButtonText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  promptSkip: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.sm,
  },
  promptSkipText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  syncError: {
    ...AppTypography.caption,
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.xs,
  },
  listContent: {
    paddingBottom: AppSpacing.xxl * 2,
  },
  footer: {
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
    alignItems: 'center',
  },
  pdfLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    paddingVertical: AppSpacing.sm,
  },
  pdfLinkText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  sourceLine: {
    ...AppTypography.caption,
    textAlign: 'center',
  },
  todayPill: {
    position: 'absolute',
    bottom: AppSpacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  todayPillText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
});
