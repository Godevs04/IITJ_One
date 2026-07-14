import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { CampusLocation } from '../types';
import { LOCATION_CATEGORIES } from '../types';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { highlightText } from '../utils/highlightText';
import type { ThemeColors } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SearchResultCardProps {
  location: CampusLocation;
  query: string;
  matchType: 'exact' | 'partial' | 'alias' | 'category' | 'address' | 'pluscode';
  matchedField?: string;
  theme: ThemeColors;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exact',
  alias: 'Alias',
  partial: 'Match',
  category: 'Category',
  address: 'Address',
  pluscode: 'Plus Code',
};

const MATCH_TYPE_ICONS: Record<string, IoniconName> = {
  exact: 'checkmark-circle',
  alias: 'layers-outline',
  partial: 'search-outline',
  category: 'grid-outline',
  address: 'location-outline',
  pluscode: 'map-outline',
};

export function SearchResultCard({
  location,
  query,
  matchType,
  matchedField,
  theme,
}: SearchResultCardProps) {
  const categoryInfo = LOCATION_CATEGORIES[location.category];
  const highlightedSegments = matchedField ? highlightText(matchedField, query) : [];

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.categoryIcon, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name={categoryInfo.icon} size={18} color={theme.primary} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {location.name}
          </Text>

          {matchedField && matchedField !== location.name && (
            <View style={styles.matchedField}>
              {highlightedSegments.map((segment, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.fieldText,
                    {
                      color: segment.isMatch ? theme.primary : theme.textMuted,
                      fontWeight: segment.isMatch ? '600' : '400',
                      backgroundColor: segment.isMatch
                        ? theme.primaryTint
                        : 'transparent',
                    },
                  ]}
                >
                  {segment.text}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.badge, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name={MATCH_TYPE_ICONS[matchType]} size={12} color={theme.primary} />
          <Text style={[styles.badgeText, { color: theme.primary }]}>
            {MATCH_TYPE_LABELS[matchType]}
          </Text>
        </View>
      </View>

      {location.address && (
        <Text style={[styles.address, { color: theme.textMuted }]} numberOfLines={1}>
          📍 {location.address}
        </Text>
      )}

      {location.plusCode && (
        <Text style={[styles.plusCode, { color: theme.textMuted }]} numberOfLines={1}>
          🎯 {location.plusCode}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  matchedField: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  fieldText: {
    ...AppTypography.caption,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {
    ...AppTypography.caption,
    fontWeight: '600',
  },
  address: {
    ...AppTypography.bodySmall,
  },
  plusCode: {
    ...AppTypography.caption,
    fontFamily: 'Courier New',
  },
});
