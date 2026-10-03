import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

/**
 * Health Center and Campus Directory are two of the most-used screens but sat
 * as look-alike grid icons. Side-by-side cards with their own colour, icon and
 * one-line purpose make them impossible to confuse.
 */
export function DirectoryShortcuts() {
  const theme = useThemeColors();

  const cards = [
    {
      key: 'health',
      title: 'Health Center',
      caption: 'Doctors on duty, contacts & hospitals',
      icon: 'medkit' as const,
      route: '/health-center' as const,
      tint: theme.errorTint,
      // `nonVeg` is the readable red in both themes (`error` is too dark on dark surfaces).
      color: theme.nonVeg,
    },
    {
      key: 'directory',
      title: 'Campus Directory',
      caption: 'Faculty, departments, clubs & offices',
      icon: 'people' as const,
      route: '/campus-directory' as const,
      tint: theme.primaryTint,
      color: theme.linkText,
    },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <Pressable
          key={card.key}
          onPress={() => router.push(card.route)}
          accessibilityRole="button"
          accessibilityLabel={`${card.title}: ${card.caption}`}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: card.tint, borderColor: card.color },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: card.color }]}>
            <Ionicons name={card.icon} size={20} color={theme.onPrimary} />
          </View>
          <Text style={[styles.title, { color: card.color }]}>{card.title}</Text>
          <Text style={[styles.caption, { color: theme.text }]} numberOfLines={2}>
            {card.caption}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.xs,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  caption: {
    ...AppTypography.caption,
  },
  pressed: {
    opacity: 0.85,
  },
});
