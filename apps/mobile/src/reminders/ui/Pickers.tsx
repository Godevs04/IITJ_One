import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';
import { formatClock, localDateKey } from '../reminderLogic';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function PickerSheet({
  visible,
  title,
  onClose,
  onConfirm,
  onClear,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  /** Shown as a "Clear" action when the value is optional. */
  onClear?: () => void;
  children: ReactNode;
}) {
  const theme = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          <Text style={[styles.sheetTitle, { color: theme.text }]} accessibilityRole="header">
            {title}
          </Text>
          {children}
          <View style={styles.actions}>
            {onClear ? (
              <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" style={styles.textAction}>
                <Text style={[styles.actionText, { color: theme.textMuted }]}>Clear</Text>
              </Pressable>
            ) : null}
            <View style={styles.actionsRight}>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" style={styles.textAction}>
                <Text style={[styles.actionText, { color: theme.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                accessibilityRole="button"
                style={[styles.confirm, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.actionText, { color: theme.onPrimary }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Month-grid calendar. Days before `minDate` cannot be picked. */
export function DatePickerSheet({
  visible,
  value,
  minDate,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: Date | null;
  minDate: Date;
  onClose: () => void;
  onChange: (date: Date) => void;
}) {
  const theme = useThemeColors();
  const [selected, setSelected] = useState<Date>(value ?? minDate);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  // Start from the current value each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const start = value ?? minDate;
    setSelected(start);
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const minKey = localDateKey(minDate);
  const selectedKey = localDateKey(selected);
  const todayKey = localDateKey(new Date());
  const leading = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const canGoBack = localDateKey(new Date(month.getFullYear(), month.getMonth(), 0)) >= minKey;
  const shift = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));

  return (
    <PickerSheet
      visible={visible}
      title="Choose a date"
      onClose={onClose}
      onConfirm={() => {
        onChange(selected);
        onClose();
      }}
    >
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => shift(-1)}
          disabled={!canGoBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[styles.monthArrow, !canGoBack && styles.disabled]}
        >
          <MaterialIcons name="chevron-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>
        <Pressable
          onPress={() => shift(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.monthArrow}
        >
          <MaterialIcons name="chevron-right" size={24} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.weekday, { color: theme.textMuted }]}>
            {d}
          </Text>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <View key={`blank-${i}`} style={styles.cell} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const key = localDateKey(date);
          const isSelected = key === selectedKey;
          const isPast = key < minKey;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(date)}
              disabled={isPast}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isPast }}
              accessibilityLabel={`${MONTHS[date.getMonth()]} ${day}, ${date.getFullYear()}`}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  isSelected && { backgroundColor: theme.chipActiveBackground },
                  !isSelected && key === todayKey && { borderWidth: 1, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: isSelected ? theme.chipActiveText : theme.text },
                    isSelected && styles.dayTextSelected,
                    isPast && styles.disabled,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </PickerSheet>
  );
}

function ChipRow<T extends number | string>({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.chipGroup}>
      <Text style={[styles.chipLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <Pressable
              key={String(option)}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label} ${format(option)}`}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.chipActiveBackground : theme.chipBackground,
                  borderColor: isSelected ? theme.chipActiveBackground : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? theme.chipActiveText : theme.text },
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {format(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Hour, minute (5-minute steps) and AM/PM. Value is minutes after midnight. */
export function TimePickerSheet({
  visible,
  title,
  value,
  fallback,
  onClose,
  onChange,
  onClear,
}: {
  visible: boolean;
  title: string;
  value: number | null;
  /** Shown when there is no value yet. */
  fallback: number;
  onClose: () => void;
  onChange: (minutes: number) => void;
  onClear?: () => void;
}) {
  const theme = useThemeColors();
  const [minutes, setMinutes] = useState(value ?? fallback);

  useEffect(() => {
    if (visible) setMinutes(value ?? fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hour24 = Math.floor(minutes / 60);
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;
  const minute = minutes % 60;
  const compose = (h12: number, m: number, pm: boolean) => ((h12 % 12) + (pm ? 12 : 0)) * 60 + m;

  return (
    <PickerSheet
      visible={visible}
      title={title}
      onClose={onClose}
      onConfirm={() => {
        onChange(minutes);
        onClose();
      }}
      onClear={
        onClear
          ? () => {
              onClear();
              onClose();
            }
          : undefined
      }
    >
      <Text style={[styles.timePreview, { color: theme.text }]} accessibilityLiveRegion="polite">
        {formatClock(minutes)}
      </Text>
      <ChipRow
        label="Hour"
        options={HOURS}
        value={hour12}
        format={(h) => String(h)}
        onChange={(h) => setMinutes(compose(h, minute, isPm))}
      />
      <ChipRow
        label="Minute"
        options={MINUTES}
        // A stored time that is off the 5-minute grid highlights nothing until the user picks one.
        value={minute}
        format={(m) => String(m).padStart(2, '0')}
        onChange={(m) => setMinutes(compose(hour12, m, isPm))}
      />
      <ChipRow
        label="AM / PM"
        options={['AM', 'PM'] as const}
        value={isPm ? 'PM' : 'AM'}
        format={(v) => v}
        onChange={(v) => setMinutes(compose(hour12, minute, v === 'PM'))}
      />
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screenMargin,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    borderRadius: AppRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  sheetTitle: {
    ...AppTypography.h2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  textAction: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  confirm: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: AppRadius.full,
    justifyContent: 'center',
  },
  actionText: {
    ...AppTypography.bodyHeader,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...AppTypography.bodyHeader,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: {
    ...AppTypography.bodySmall,
    width: `${100 / 7}%`,
    height: 24,
    textAlign: 'center',
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...AppTypography.body,
  },
  dayTextSelected: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.3,
  },
  timePreview: {
    ...AppTypography.display,
    textAlign: 'center',
  },
  chipGroup: {
    gap: spacing.xs,
  },
  chipLabel: {
    ...AppTypography.bodySmall,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: 48,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    ...AppTypography.body,
  },
});
