import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { highlightText } from '@/campus/utils/highlightText';
import type { SearchEntry } from '@/services/search/types';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface GlobalSearchResultCardProps {
  entry: SearchEntry;
  query: string;
  matchedField?: string;
}

export function GlobalSearchResultCard({ entry, query, matchedField }: GlobalSearchResultCardProps) {
  const theme = useThemeColors();
  const showMatchedField = matchedField && matchedField !== entry.title && matchedField !== entry.subtitle;
  const subtitleSegments = entry.subtitle ? highlightText(entry.subtitle, query) : [];

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.primaryTint }]}>
        <Ionicons name={entry.icon} size={18} color={theme.primary} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {entry.title}
        </Text>

        {entry.subtitle ? (
          <Text style={styles.subtitleRow} numberOfLines={2}>
            {subtitleSegments.map((segment, idx) => (
              <Text
                key={idx}
                style={[
                  styles.subtitleText,
                  {
                    color: segment.isMatch ? theme.primary : theme.textMuted,
                    fontWeight: segment.isMatch ? '600' : '400',
                  },
                ]}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        ) : null}

        {showMatchedField ? (
          <Text style={[styles.matchedFieldText, { color: theme.textMuted }]} numberOfLines={1}>
            Matched: {matchedField}
          </Text>
        ) : null}
      </View>

      <View style={[styles.badge, { backgroundColor: theme.chipBackground }]}>
        <Text style={[styles.badgeText, { color: theme.chipText }]} numberOfLines={1}>
          {entry.module}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  subtitleRow: {
    ...AppTypography.bodySmall,
  },
  subtitleText: {
    ...AppTypography.bodySmall,
  },
  matchedFieldText: {
    ...AppTypography.caption,
    fontStyle: 'italic',
  },
  badge: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
    flexShrink: 0,
    maxWidth: 110,
  },
  badgeText: {
    ...AppTypography.caption,
    fontWeight: '600',
  },
});
