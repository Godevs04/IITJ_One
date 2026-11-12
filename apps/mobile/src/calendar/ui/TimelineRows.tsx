import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { ACADEMIC_DISPLAY_TYPE_LABELS } from '@iitj1/types';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing } from '@/theme/tokens';
import { formatRange, type CarryItem, type DayItem, type GapItem, MONTH_NAMES } from '../buildTimeline';
import { audienceLabel, type TimelineEvent } from '../eventRules';
import { FONT_SCALE_CAP, itemHeight, typeAccent, type RowMetrics } from './layout';

const CAP = { maxFontSizeMultiplier: FONT_SCALE_CAP, allowFontScaling: true } as const;

/** One fixed-height text line — the building block that keeps row heights exact. */
function Line({ height, style, children, testID }: { height: number; style?: TextStyle | TextStyle[]; children: React.ReactNode; testID?: string }) {
  return (
    <View style={{ height, justifyContent: 'center' }}>
      <Text {...CAP} numberOfLines={1} style={style} testID={testID}>
        {children}
      </Text>
    </View>
  );
}

export const MonthHeader = memo(function MonthHeader({ title, m }: { title: string; m: RowMetrics }) {
  const theme = useThemeColors();
  return (
    <View style={[styles.header, { height: m.header, backgroundColor: theme.background, borderBottomColor: theme.border }]} accessibilityRole="header">
      <Text {...CAP} style={[styles.headerText, { color: theme.text }]}>{title}</Text>
    </View>
  );
});

function metaFor(e: TimelineEvent): string {
  const bits: string[] = [ACADEMIC_DISPLAY_TYPE_LABELS[e.displayType]];
  if (e.officialHoliday) bits.push('Official Institute Holiday');
  if (e.startDate !== e.endDate) bits.push(formatRange(e.startDate, e.endDate));
  if (e.tentative) bits.push('Tentative');
  if (e.noClassDay) bits.push('No class day');
  if (e.classHoliday) bits.push('Class holiday');
  const audience = audienceLabel(e);
  if (audience) bits.push(audience);
  if (e.followsTimetableOf) bits.push(`${e.followsTimetableOf}'s timetable`);
  return bits.join(' · ');
}

function EventBlock({
  event,
  m,
  onPress,
  onBusPress,
}: {
  event: TimelineEvent;
  m: RowMetrics;
  onPress: (e: TimelineEvent) => void;
  onBusPress: (e: TimelineEvent) => void;
}) {
  const theme = useThemeColors();
  const accent = typeAccent(event.displayType, theme);
  const holiday = !!event.officialHoliday;
  return (
    <View style={[styles.eventBlock, holiday && { backgroundColor: theme.errorTint }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.eventText}>
        <Pressable
          onPress={() => onPress(event)}
          accessibilityRole="button"
          accessibilityLabel={`${event.title}. ${metaFor(event)}`}
          accessibilityHint="Opens event details"
        >
          <Line height={m.titleLine} style={[styles.title, { color: theme.text }]}>
            {event.title}
          </Line>
          <Line height={m.metaLine} style={[styles.meta, { color: holiday ? accent : theme.textMuted }]}>
            {metaFor(event)}
          </Line>
        </Pressable>
        {holiday ? (
          <Pressable
            onPress={() => onBusPress(event)}
            accessibilityRole="button"
            accessibilityLabel={`Bus schedule for ${event.title}`}
            hitSlop={6}
          >
            <Line height={m.busLine} style={[styles.bus, { color: theme.linkText }]}>
              🚌 Bus schedule for this day ›
            </Line>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const DayRow = memo(function DayRow({
  item,
  m,
  onEventPress,
  onBusPress,
  onMorePress,
}: {
  item: DayItem;
  m: RowMetrics;
  onEventPress: (e: TimelineEvent) => void;
  onBusPress: (e: TimelineEvent) => void;
  onMorePress: (item: DayItem) => void;
}) {
  const theme = useThemeColors();
  const day = Number(item.date.slice(8, 10));
  const weekday = new Date(`${item.date}T00:00:00Z`).getUTCDay();
  const wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][weekday];
  return (
    <View style={{ height: itemHeight(item, m), opacity: item.isPast ? 0.55 : 1 }}>
      {item.isToday ? (
        <View style={[styles.todayMarker, { height: m.todayMarker }]} accessibilityLabel="Today">
          <View style={[styles.todayRule, { backgroundColor: theme.accent }]} />
          <Text {...CAP} style={[styles.todayText, { color: theme.accent }]}>TODAY</Text>
          <View style={[styles.todayRule, { backgroundColor: theme.accent }]} />
        </View>
      ) : null}
      <View style={[styles.dayRow, { paddingVertical: m.dayPadding }]}>
        <View style={styles.dateCol} accessible accessibilityLabel={`${day} ${wd}`}>
          <Line height={m.dayNumber} style={[styles.dayNumber, { color: item.isToday ? theme.accent : theme.text }]}>
            {String(day).padStart(2, '0')}
          </Line>
          <Line height={m.weekday} style={[styles.weekday, { color: item.isToday ? theme.accent : theme.textMuted }]}>
            {wd}
          </Line>
        </View>
        <View style={styles.eventsCol}>
          {item.shown.length === 0 ? (
            <Line height={m.infoLine} style={[styles.info, { color: theme.textMuted }]}>No events today</Line>
          ) : null}
          {item.shown.map((e, i) => (
            <View key={e.id} style={i > 0 ? { marginTop: m.eventGap } : undefined}>
              <EventBlock event={e} m={m} onPress={onEventPress} onBusPress={onBusPress} />
            </View>
          ))}
          {item.more > 0 ? (
            <Pressable onPress={() => onMorePress(item)} accessibilityRole="button" accessibilityLabel={`${item.more} more ${item.more === 1 ? 'event' : 'events'} on this day`}>
              <Line height={m.moreLine} style={[styles.more, { color: theme.linkText }]}>+{item.more} more</Line>
            </Pressable>
          ) : null}
          {item.ongoing.map((e) => (
            <Pressable key={`ongoing:${e.id}`} onPress={() => onEventPress(e)} accessibilityRole="button">
              <Line height={m.infoLine} style={[styles.info, { color: theme.textMuted }]}>
                Ongoing: {e.title} · until {formatRange(e.endDate, e.endDate)}
              </Line>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
});

export const GapRow = memo(function GapRow({ item, m }: { item: GapItem; m: RowMetrics }) {
  const theme = useThemeColors();
  const [, mm, dd] = item.untilDate.split('-').map(Number);
  return (
    <View style={[styles.gap, { height: m.gap }]}>
      <Text {...CAP} numberOfLines={1} style={[styles.gapText, { color: theme.textMuted }]}>
        · No events until {dd} {MONTH_NAMES[mm - 1]} ·
      </Text>
    </View>
  );
});

export const CarryRow = memo(function CarryRow({
  item,
  m,
  onEventPress,
}: {
  item: CarryItem;
  m: RowMetrics;
  onEventPress: (e: TimelineEvent) => void;
}) {
  const theme = useThemeColors();
  return (
    <View style={{ height: itemHeight(item, m), paddingVertical: m.carryPadding, paddingLeft: 52 + AppSpacing.lg + AppSpacing.md, paddingRight: AppSpacing.lg }}>
      {item.events.map((e) => (
        <Pressable key={`carry:${e.id}`} onPress={() => onEventPress(e)} accessibilityRole="button">
          <Line height={m.infoLine} style={[styles.info, { color: theme.textMuted }]}>
            Continues from {item.monthLabel}: {e.title} · until {formatRange(e.endDate, e.endDate)}
          </Line>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    justifyContent: 'flex-end',
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  dayRow: {
    flexDirection: 'row',
    paddingHorizontal: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  dateCol: {
    width: 52,
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weekday: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  eventsCol: {
    flex: 1,
    minWidth: 0,
  },
  eventBlock: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: AppSpacing.sm,
  },
  eventText: {
    flex: 1,
    minWidth: 0,
    paddingRight: AppSpacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bus: {
    fontSize: 13,
    fontWeight: '600',
  },
  more: {
    fontSize: 13,
    fontWeight: '600',
  },
  info: {
    fontSize: 13,
  },
  todayMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: 6,
    gap: AppSpacing.sm,
  },
  todayRule: {
    flex: 1,
    height: 1,
  },
  todayText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  gap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gapText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
