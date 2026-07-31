import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

export interface ComingSoonFeature {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface ComingSoonPlaceholderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  note: string;
  features: ComingSoonFeature[];
}

/** Shared "architecture is ready, content isn't yet" placeholder for Campus Directory sub-pages. */
export function ComingSoonPlaceholder({ icon, title, body, note, features }: ComingSoonPlaceholderProps) {
  const theme = useThemeColors();

  return (
    <>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name={icon} size={36} color={theme.linkText} />
        </View>
        <Text style={[styles.heroTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.heroBody, { color: theme.textMuted }]}>{body}</Text>
        <View style={[styles.badge, { backgroundColor: theme.secondaryTint }]}>
          <Ionicons name="construct-outline" size={14} color={theme.secondary} />
          <Text style={[styles.badgeText, { color: theme.secondary }]}>Coming Soon</Text>
        </View>
      </View>

      <View style={[styles.noteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.noteText, { color: theme.textMuted }]}>{note}</Text>
      </View>

      {features.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>What&apos;s coming</Text>
          <View style={styles.featureGrid}>
            {features.map((feature) => (
              <View
                key={feature.label}
                style={[styles.featureCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
              >
                <Ionicons name={feature.icon} size={22} color={theme.iconMuted} />
                <Text style={[styles.featureLabel, { color: theme.textMuted }]}>{feature.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.md,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...AppTypography.display },
  heroBody: {
    ...AppTypography.body,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    marginTop: AppSpacing.xs,
  },
  badgeText: { ...AppTypography.bodySmall, fontWeight: '600' },
  noteCard: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
  },
  noteText: { ...AppTypography.bodySmall },
  section: { gap: AppSpacing.sm },
  sectionLabel: { ...AppTypography.sectionLabel },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  featureCard: {
    width: '47%',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  featureLabel: { ...AppTypography.bodySmall },
});
