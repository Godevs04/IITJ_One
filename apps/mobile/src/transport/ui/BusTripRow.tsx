import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import type { TransportTrip } from '@/types/campus';

/** Campus stops are spelled several ways in the timetable; show them as one readable name. */
export function displayStop(name: string): string {
  const n = name.replace(/\*$/, '').trim();
  return /^iitj$/i.test(n) ? 'IITJ Campus' : n;
}

/**
 * One scheduled trip: [B1]  Old Mess 10:30 AM ── 1 hr ── MBM 11:30 AM.
 * The next bus is emphasised (primary border + "Starts in…" tag); finished trips are dimmed.
 */
function BusTripRowComponent({
  trip,
  duration,
  label,
  emphasized = false,
  dimmed = false,
  badges,
  onPress,
}: {
  trip: TransportTrip;
  /** "1 hr" — omitted when the timetable has no usable arrival time. */
  duration: string | null;
  /** "Starts in 20 min" / "On the way" — shown for the emphasised trip. */
  label?: string | null;
  emphasized?: boolean;
  dimmed?: boolean;
  /** Small status icons (reminder set, live) shown after the label. */
  badges?: ReactNode;
  onPress?: () => void;
}) {
  const theme = useThemeColors();
  const from = displayStop(trip.from);
  const to = displayStop(trip.to);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${trip.bus}, ${from} ${trip.startTime} to ${to} ${trip.endTime}${label ? `, ${label}` : ''}`}
      accessibilityHint={onPress ? 'Shows the route and stops' : undefined}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: emphasized ? theme.primary : theme.border,
          borderWidth: emphasized ? 2 : StyleSheet.hairlineWidth,
          opacity: dimmed ? 0.55 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      {label || badges ? (
        <View style={styles.topRow}>
          {label ? (
            <View style={[styles.labelChip, { backgroundColor: emphasized ? theme.highlight : theme.surfaceMuted }]}>
              <MaterialIcons name="schedule" size={12} color={emphasized ? theme.onHighlight : theme.textMuted} />
              <Text style={[styles.labelText, { color: emphasized ? theme.onHighlight : theme.textMuted }]}>{label}</Text>
            </View>
          ) : (
            <View />
          )}
          {badges ? <View style={styles.badges}>{badges}</View> : null}
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={[styles.busBadge, { backgroundColor: emphasized ? theme.primary : theme.primaryTint }]}>
          <Text style={[styles.busText, { color: emphasized ? theme.onPrimary : theme.linkText }]}>{trip.bus}</Text>
        </View>

        <View style={styles.endpoint}>
          <Text style={[styles.stop, { color: theme.textMuted }]} numberOfLines={1}>
            {from}
          </Text>
          <Text style={[styles.time, { color: theme.text }]}>{trip.startTime}</Text>
        </View>

        <View style={styles.connector} importantForAccessibility="no-hide-descendants">
          <View style={[styles.line, { backgroundColor: theme.border }]} />
          {duration ? <Text style={[styles.duration, { color: theme.textMuted }]}>{duration}</Text> : null}
          <View style={[styles.line, { backgroundColor: theme.border }]} />
        </View>

        <View style={[styles.endpoint, styles.endpointRight]}>
          <Text style={[styles.stop, styles.right, { color: theme.textMuted }]} numberOfLines={1}>
            {to}
          </Text>
          <Text style={[styles.time, styles.right, { color: theme.text }]}>{trip.endTime}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const BusTripRow = memo(BusTripRowComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  labelText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  busBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xs,
  },
  busText: {
    ...AppTypography.bodyHeader,
  },
  endpoint: {
    flex: 1,
    minWidth: 0,
  },
  endpointRight: {
    alignItems: 'flex-end',
  },
  stop: {
    ...AppTypography.bodySmall,
  },
  time: {
    ...AppTypography.bodyHeader,
    fontSize: 15,
  },
  right: {
    textAlign: 'right',
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 88,
  },
  line: {
    width: 12,
    height: 1,
  },
  duration: {
    ...AppTypography.small,
    fontWeight: '600',
  },
});
