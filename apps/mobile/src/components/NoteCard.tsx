import { Pressable, StyleSheet, Text } from 'react-native';
import type { Note } from '@/services/localDb';
import { formatRelativeTime } from '@/utils/date';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface NoteCardProps {
  note: Note;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function NoteCard({ note, onPress, onLongPress }: NoteCardProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title} numberOfLines={1}>
        {note.title || 'Untitled'}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {note.body || 'No content'}
      </Text>
      <Text style={styles.timestamp}>Edited {formatRelativeTime(note.updatedAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.desertSand,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  title: {
    ...AppTypography.h2,
    color: AppColors.inkSlate,
  },
  preview: {
    ...AppTypography.bodySmall,
    color: AppColors.mutedText,
  },
  timestamp: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
    alignSelf: 'flex-end',
  },
});
