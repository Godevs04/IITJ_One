import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import type { FacilityItem } from '../data/healthCenterData';

interface FacilityGridProps {
  items: FacilityItem[];
}

/** Read-only icon grid — no onPress/navigation, unlike QuickAccessTile. */
export function FacilityGrid({ items }: FacilityGridProps) {
  const theme = useThemeColors();

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.tile}>
          <View style={[styles.iconBox, { backgroundColor: theme.errorTint }]}>
            <Ionicons name={item.icon} size={22} color={theme.error} />
          </View>
          <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.xs,
    gap: AppSpacing.sm,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...AppTypography.caption,
    fontWeight: '500',
    textAlign: 'center',
  },
});
