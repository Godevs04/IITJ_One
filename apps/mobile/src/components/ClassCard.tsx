import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TimetableEntry } from '@/services/localDb';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface ClassCardProps {
  entry: TimetableEntry;
  onPress?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture',
  lab: 'Lab',
  tutorial: 'Tutorial',
};

export function ClassCard({ entry, onPress }: ClassCardProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{entry.className}</Text>
          <View style={[styles.typeTag, { backgroundColor: theme.secondaryTint }]}>
            <Text style={[styles.typeText, { color: theme.secondary }]}>
              {TYPE_LABELS[entry.classType] ?? entry.classType}
            </Text>
          </View>
        </View>
        <Text style={[styles.time, { color: theme.text }]}>
          {entry.startTime} – {entry.endTime}
        </Text>
      </View>
      {entry.room ? (
        <Text style={[styles.room, { color: theme.textMuted }]}>{entry.room}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  title: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  typeTag: {
    alignSelf: 'flex-start',
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...AppTypography.caption,
    fontWeight: '500',
  },
  time: {
    ...AppTypography.dataMono,
    fontFamily: 'monospace',
  },
  room: {
    ...AppTypography.bodySmall,
  },
});
