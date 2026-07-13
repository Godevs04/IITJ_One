import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TimetableEntry } from '@/services/localDb';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{entry.className}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{TYPE_LABELS[entry.classType] ?? entry.classType}</Text>
          </View>
        </View>
        <Text style={styles.time}>
          {entry.startTime} – {entry.endTime}
        </Text>
      </View>
      {entry.room ? (
        <Text style={styles.room}>{entry.room}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
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
    color: AppColors.inkSlate,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.sandstoneTint,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...AppTypography.caption,
    color: AppColors.mehrangarhSandstone,
  },
  time: {
    ...AppTypography.dataMono,
    color: AppColors.inkSlate,
    fontFamily: 'monospace',
  },
  room: {
    ...AppTypography.bodySmall,
    color: AppColors.mutedText,
  },
});
