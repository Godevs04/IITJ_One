import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CalendarEvent, HolidaysDoc } from '@/types/campus';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface HolidayItem {
  name: string;
  /** YYYY-MM-DD */
  start: string;
  end: string;
  description?: string;
}

const DAY_MS = 86_400_000;

function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysAway(ymd: string): number {
  return Math.round((parseDate(ymd).getTime() - todayStart().getTime()) / DAY_MS);
}

function relativeLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** Friday or Monday holidays join onto the weekend — the thing students actually plan trips around. */
function isLongWeekend(item: HolidayItem): boolean {
  const startDay = parseDate(item.start).getDay();
  const endDay = parseDate(item.end).getDay();
  return startDay === 1 || endDay === 5 || startDay === 5;
}

/**
 * Official holiday list (admin-managed `holidays` module) merged with any
 * calendar events tagged "holiday" — previously only the latter were shown,
 * so the Holiday filter was often near-empty.
 */
export function HolidayList({ holidays, events }: { holidays: HolidaysDoc | null; events: CalendarEvent[] }) {
  const theme = useThemeColors();
  const [showPast, setShowPast] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const seen = new Set<string>();
    const merged: HolidayItem[] = [];
    const add = (item: HolidayItem) => {
      const key = `${item.start}|${item.name.trim().toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    };
    (holidays?.holidays ?? [])
      .filter((h) => h.isActive)
      .forEach((h) => add({ name: h.name, start: h.date, end: h.date, description: h.description }));
    events
      .filter((e) => e.type.toLowerCase() === 'holiday')
      .forEach((e) => add({ name: e.title, start: e.startDate.slice(0, 10), end: (e.endDate || e.startDate).slice(0, 10) }));

    merged.sort((a, b) => a.start.localeCompare(b.start));
    return {
      upcoming: merged.filter((h) => daysAway(h.end) >= 0),
      past: merged.filter((h) => daysAway(h.end) < 0).reverse(),
    };
  }, [holidays, events]);

  if (upcoming.length === 0 && past.length === 0) {
    return <EmptyState icon="sunny-outline" title="No holidays listed" message="Pull down to sync the holiday list." />;
  }

  const next = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <View style={{ gap: AppSpacing.md }}>
      {next ? (
        <View style={[styles.hero, { backgroundColor: theme.secondaryTint, borderColor: theme.secondary }]}>
          <Text style={[styles.heroLabel, { color: theme.secondary }]}>NEXT HOLIDAY</Text>
          <Text style={[styles.heroName, { color: theme.text }]}>{next.name}</Text>
          <Text style={[styles.heroDate, { color: theme.textMuted }]}>{formatRange(next)}</Text>
          <View style={styles.heroFooter}>
            <View style={[styles.countPill, { backgroundColor: theme.secondary }]}>
              <Text style={[styles.countPillText, { color: theme.onPrimary }]}>
                {relativeLabel(Math.max(0, daysAway(next.start)))}
              </Text>
            </View>
            {isLongWeekend(next) ? <Tag label="Long weekend" color={theme.veg} /> : null}
          </View>
        </View>
      ) : null}

      {groupByMonth(rest).map(([month, items]) => (
        <View key={month} style={{ gap: AppSpacing.sm }}>
          <Text style={[styles.monthLabel, { color: theme.textMuted }]}>{month}</Text>
          {items.map((item) => (
            <HolidayRow key={`${item.start}-${item.name}`} item={item} />
          ))}
        </View>
      ))}

      {past.length > 0 ? (
        <Pressable onPress={() => setShowPast((v) => !v)} style={styles.pastToggle} accessibilityRole="button">
          <Text style={[styles.monthLabel, { color: theme.textMuted }]}>Past holidays ({past.length})</Text>
          <Ionicons name={showPast ? 'chevron-up' : 'chevron-down'} size={18} color={theme.iconMuted} />
        </Pressable>
      ) : null}
      {showPast ? past.map((item) => <HolidayRow key={`${item.start}-${item.name}`} item={item} dimmed />) : null}
    </View>
  );
}

function HolidayRow({ item, dimmed = false }: { item: HolidayItem; dimmed?: boolean }) {
  const theme = useThemeColors();
  const date = parseDate(item.start);
  const days = daysAway(item.start);
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: dimmed ? 0.55 : 1 },
      ]}
    >
      <View style={[styles.dateBadge, { backgroundColor: theme.secondaryTint }]}>
        <Text style={[styles.dateDay, { color: theme.secondary }]}>{date.getDate()}</Text>
        <Text style={[styles.dateMonth, { color: theme.secondary }]}>
          {date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
          {formatRange(item)}
          {!dimmed ? ` · ${relativeLabel(days)}` : ''}
        </Text>
        {item.description ? (
          <Text style={[styles.rowMeta, { color: theme.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
      {!dimmed && isLongWeekend(item) ? <Tag label="Long weekend" color={theme.veg} /> : null}
    </View>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function formatRange(item: HolidayItem): string {
  const fmt = (ymd: string) =>
    parseDate(ymd).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return item.start === item.end ? fmt(item.start) : `${fmt(item.start)} – ${fmt(item.end)}`;
}

function groupByMonth(items: HolidayItem[]): [string, HolidayItem[]][] {
  const groups = new Map<string, HolidayItem[]>();
  for (const item of items) {
    const month = parseDate(item.start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    groups.set(month, [...(groups.get(month) ?? []), item]);
  }
  return [...groups.entries()];
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1.5,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: 4,
  },
  heroLabel: {
    ...AppTypography.sectionLabel,
  },
  heroName: {
    ...AppTypography.h1,
  },
  heroDate: {
    ...AppTypography.body,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.sm,
  },
  countPill: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  countPillText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  monthLabel: {
    ...AppTypography.sectionLabel,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
  },
  dateBadge: {
    width: 48,
    borderRadius: AppRadius.sm,
    paddingVertical: AppSpacing.xs,
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  dateMonth: {
    ...AppTypography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  rowName: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  rowMeta: {
    ...AppTypography.caption,
  },
  tag: {
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    ...AppTypography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  pastToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AppSpacing.sm,
  },
});
