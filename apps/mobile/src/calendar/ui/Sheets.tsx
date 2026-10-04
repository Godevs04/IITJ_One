import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACADEMIC_DISPLAY_TYPE_LABELS, ACADEMIC_TERM_LABELS } from '@iitj1/types';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { useModalOverlayLock } from '@/services/overlayGate';
import { formatLongDate, formatRange, type DayItem, type MonthOption } from '../buildTimeline';
import { audienceLabel, type CalendarProgram, type TimelineEvent } from '../eventRules';
import { useTransportForDate } from '../useTransportForDate';
import { typeAccent } from './layout';

function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  useModalOverlayLock(visible);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, AppSpacing.lg) }]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={4} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={theme.textMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useThemeColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// --- holiday bus schedule (plan §9.5) ---------------------------------------------------------

export function BusScheduleSection({
  event,
  today,
  onNavigate,
}: {
  event: TimelineEvent;
  today: string;
  /** Close the sheet before leaving the screen, so it does not stay on top of Transport. */
  onNavigate: () => void;
}) {
  const theme = useThemeColors();
  const info = useTransportForDate(event.startDate);
  if (!info) return null;
  const { result, exceptionTrips, overrideTrips, loading } = info;
  const past = event.startDate < today;
  const label = formatRange(event.startDate, event.startDate);

  const openTimetable = (dayKey: 'mon-sat' | 'sun-holiday') => {
    onNavigate();
    router.push({ pathname: '/(tabs)/transport', params: { dayType: dayKey, for: `${label} · ${event.title}` } } as never);
  };

  let heading: string;
  let body: string;
  let action: { label: string; dayKey: 'mon-sat' | 'sun-holiday' } | null = null;
  switch (result.layer) {
    case 'exception':
      heading = 'Special transport schedule for this day';
      body = result.basis;
      break;
    case 'alert_override':
      heading = 'Transport service update in effect';
      body = result.basis;
      break;
    case 'configured_holiday':
      heading = 'Holiday bus schedule';
      body = `Transport runs the Sunday & Holidays timetable on this date (${result.basis}).`;
      action = { label: past ? 'View the timings that applied →' : 'View holiday bus timings →', dayKey: 'sun-holiday' };
      break;
    case 'sunday':
      heading = 'Sunday & Holidays bus schedule';
      body = 'This holiday falls on a Sunday, so the Sunday & Holidays timetable applies.';
      action = { label: 'View holiday bus timings →', dayKey: 'sun-holiday' };
      break;
    default:
      heading = 'Holiday bus schedule not configured';
      body =
        'Transport has not configured a holiday or special schedule for this date. ' +
        (past ? 'The regular Mon–Sat timetable applied.' : 'The regular Mon–Sat timetable currently applies.');
      action = { label: 'View Mon–Sat timings →', dayKey: 'mon-sat' };
  }

  const trips = result.layer === 'exception'
    ? exceptionTrips.map((t) => ({ bus: t.bus, time: t.startTime, from: t.from, to: t.to }))
    : overrideTrips;

  return (
    <View style={[styles.busCard, { backgroundColor: theme.primaryTint }]} accessibilityLabel={`${heading}. ${body}`}>
      <View style={styles.busHeading}>
        <Text style={styles.busIcon}>🚌</Text>
        <Text style={[styles.busTitle, { color: theme.text }]}>{heading}</Text>
      </View>
      <Text style={[styles.body, { color: theme.textMuted }]}>{loading ? 'Checking the transport schedule…' : body}</Text>
      {trips.length > 0 ? (
        <View style={{ gap: 4 }}>
          {trips.map((t, i) => (
            <Text key={`${t.bus}-${t.time}-${i}`} style={[styles.body, { color: theme.text }]}>
              {t.time} · {t.bus} · {t.from} → {t.to}
            </Text>
          ))}
        </View>
      ) : null}
      {action ? (
        <Pressable onPress={() => openTimetable(action.dayKey)} accessibilityRole="button" hitSlop={6}>
          <Text style={[styles.busAction, { color: theme.linkText }]}>{action.label}</Text>
        </Pressable>
      ) : null}
      {result.exceptionUnknown && !loading ? (
        <Text style={[styles.note, { color: theme.textMuted }]}>
          Couldn&apos;t check whether Transport has published a special schedule for this date. Transport&apos;s own screen is always authoritative.
        </Text>
      ) : null}
    </View>
  );
}

// --- event detail -------------------------------------------------------------------------------

export function EventDetailSheet({
  event,
  onClose,
  today,
  sourceLine,
}: {
  event: TimelineEvent | null;
  onClose: () => void;
  today: string;
  sourceLine: string | null;
}) {
  const theme = useThemeColors();
  const e = event;
  const accent = e ? typeAccent(e.displayType, theme) : theme.text;
  const showSourceText = !!e?.sourceText && e.sourceText.trim().toLowerCase() !== e.title.trim().toLowerCase();
  const dateText = e
    ? e.startDate === e.endDate
      ? formatLongDate(e.startDate)
      : `${formatLongDate(e.startDate)} – ${formatLongDate(e.endDate)}`
    : '';
  const audience = e ? audienceLabel(e) : null;

  return (
    <BottomSheet visible={!!e} onClose={onClose} title={e?.title ?? ''}>
      {e ? (
        <>
          <View style={styles.tags}>
            <Tag label={ACADEMIC_DISPLAY_TYPE_LABELS[e.displayType]} color={accent} />
            {e.officialHoliday ? <Tag label="Official Institute Holiday" color={accent} /> : null}
            {e.tentative ? <Tag label="Tentative" color={theme.accent} /> : null}
            {e.noClassDay ? <Tag label="No class day" color={theme.linkText} /> : null}
            {e.classHoliday ? <Tag label="Class holiday" color={theme.linkText} /> : null}
            {e.subjectToChange ? <Tag label="Subject to change" color={theme.accent} /> : null}
            {audience ? <Tag label={audience} color={theme.secondary} /> : null}
          </View>

          <Row label="Date">
            <Text style={[styles.value, { color: theme.text }]}>{dateText}</Text>
          </Row>
          {e.term && e.term !== 'pre_ay' ? (
            <Row label="Term">
              <Text style={[styles.value, { color: theme.text }]}>
                {ACADEMIC_TERM_LABELS[e.term]}
                {e.academicYear ? ` · Academic year ${e.academicYear}` : ''}
              </Text>
            </Row>
          ) : null}
          {e.followsTimetableOf ? (
            <Row label="Classes">
              <Text style={[styles.value, { color: theme.text }]}>{e.followsTimetableOf}&apos;s timetable is followed</Text>
            </Row>
          ) : null}

          {e.officialHoliday ? <BusScheduleSection event={e} today={today} onNavigate={onClose} /> : null}
          {e.noClassDay ? (
            <Text style={[styles.note, { color: theme.textMuted }]}>
              A no-class day does not change bus timings by itself — the regular schedule applies unless Transport announces otherwise.
            </Text>
          ) : null}

          {e.resolution ? (
            <Row label="Date confirmed">
              <Text style={[styles.value, { color: theme.text }]}>{e.resolution.resolvedSource}</Text>
            </Row>
          ) : null}

          {showSourceText || e.dateSourceText ? (
            <View style={[styles.sourceBox, { borderColor: theme.border }]}>
              <Text style={[styles.sourceLabel, { color: theme.textMuted }]}>As printed in the official calendar</Text>
              {showSourceText ? <Text style={[styles.body, { color: theme.text }]}>“{e.sourceText}”</Text> : null}
              {e.dateSourceText ? <Text style={[styles.body, { color: theme.text }]}>“{e.dateSourceText}”</Text> : null}
            </View>
          ) : null}

          {(e.notes ?? []).map((n) => (
            <Text key={n} style={[styles.note, { color: theme.textMuted }]}>{n}</Text>
          ))}

          {e.sources?.length ? (
            <Text style={[styles.note, { color: theme.textMuted }]}>
              Source: {e.sources.map((s) => `${s.sectionTitle.split(' — ')[0]}${s.row ? `, ${s.part === 'F' ? 'S. No.' : 'S.N.'} ${s.row}` : ''}, p.${s.page}`).join('; ')}
              {sourceLine ? `\n${sourceLine}` : ''}
            </Text>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
}

// --- crowded day ---------------------------------------------------------------------------------

export function DaySheet({
  item,
  onClose,
  onEventPress,
}: {
  item: DayItem | null;
  onClose: () => void;
  onEventPress: (e: TimelineEvent) => void;
}) {
  const theme = useThemeColors();
  return (
    <BottomSheet visible={!!item} onClose={onClose} title={item ? formatLongDate(item.date) : ''}>
      {(item?.events ?? []).map((e) => (
        <Pressable
          key={e.id}
          onPress={() => onEventPress(e)}
          style={({ pressed }) => [styles.dayEvent, { borderLeftColor: typeAccent(e.displayType, theme) }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Text style={[styles.value, { color: theme.text, fontWeight: '600' }]}>{e.title}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {ACADEMIC_DISPLAY_TYPE_LABELS[e.displayType]}
            {e.startDate !== e.endDate ? ` · ${formatRange(e.startDate, e.endDate)}` : ''}
          </Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

// --- month picker --------------------------------------------------------------------------------

export function MonthPickerSheet({
  visible,
  months,
  currentKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  months: MonthOption[];
  currentKey: string | null;
  onSelect: (m: MonthOption) => void;
  onClose: () => void;
}) {
  const theme = useThemeColors();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Jump to month">
      <View style={styles.monthGrid}>
        {months.map((m) => {
          const disabled = m.sectionIndex === null;
          const active = m.key === currentKey;
          return (
            <Pressable
              key={m.key}
              disabled={disabled}
              onPress={() => onSelect(m)}
              style={[
                styles.monthCell,
                { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.chipBackground },
                disabled && { opacity: 0.4 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`${m.label}, ${m.count} events`}
            >
              <Text style={[styles.monthLabel, { color: active ? theme.onPrimary : theme.text }]}>{m.label}</Text>
              <Text style={[styles.monthCount, { color: active ? theme.onPrimary : theme.textMuted }]}>
                {m.count} {m.count === 1 ? 'event' : 'events'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

// --- calendar settings (program) -----------------------------------------------------------------

export function CalendarSettingsSheet({
  visible,
  program,
  onChange,
  onClose,
}: {
  visible: boolean;
  program: CalendarProgram;
  onChange: (p: CalendarProgram) => void;
  onClose: () => void;
}) {
  const theme = useThemeColors();
  const options: { key: CalendarProgram; label: string; hint: string }[] = [
    { key: 'all', label: 'Show all events', hint: 'Default — nothing is hidden.' },
    { key: 'ug', label: 'UG', hint: 'Hides events the calendar marks for New PG students only.' },
    { key: 'pg', label: 'PG', hint: 'Hides events the calendar marks for UG / first-year UG students only.' },
  ];
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Calendar settings">
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Your program is stored only on this phone. Events are hidden only when the official calendar names a specific audience.
      </Text>
      {options.map((o) => {
        const active = program === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.option, { borderColor: active ? theme.primary : theme.border }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? theme.linkText : theme.iconMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.value, { color: theme.text, fontWeight: '600' }]}>{o.label}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>{o.hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    maxHeight: '85%',
    paddingHorizontal: AppSpacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: AppSpacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.md,
    paddingTop: AppSpacing.md,
    paddingBottom: AppSpacing.sm,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  sheetBody: {
    gap: AppSpacing.md,
    paddingBottom: AppSpacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.xs,
  },
  tag: {
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  rowLabel: {
    ...AppTypography.bodySmall,
    width: 96,
  },
  value: {
    ...AppTypography.body,
  },
  body: {
    ...AppTypography.bodySmall,
  },
  meta: {
    ...AppTypography.caption,
  },
  note: {
    ...AppTypography.caption,
  },
  sourceBox: {
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  sourceLabel: {
    ...AppTypography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  busCard: {
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  busHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  busIcon: {
    fontSize: 16,
  },
  busTitle: {
    ...AppTypography.body,
    fontWeight: '700',
    flex: 1,
  },
  busAction: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  dayEvent: {
    borderLeftWidth: 3,
    paddingLeft: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    gap: 2,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  monthCell: {
    width: '48%',
    borderWidth: 1,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
  },
  monthLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  monthCount: {
    ...AppTypography.caption,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
  },
});
