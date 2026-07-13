import { Pressable, StyleSheet, Text } from 'react-native';
import type { Note } from '@/services/localDb';
import { formatRelativeTime } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface NoteCardProps {
  note: Note;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function NoteCard({ note, onPress, onLongPress }: NoteCardProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.noteCardBg },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {note.title || 'Untitled'}
      </Text>
      <Text style={[styles.preview, { color: theme.textMuted }]} numberOfLines={2}>
        {note.body || 'No content'}
      </Text>
      <Text style={[styles.timestamp, { color: theme.textMuted }]}>
        Edited {formatRelativeTime(note.updatedAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
    fontWeight: '600',
  },
  preview: {
    ...AppTypography.bodySmall,
  },
  timestamp: {
    ...AppTypography.caption,
    alignSelf: 'flex-end',
  },
});
