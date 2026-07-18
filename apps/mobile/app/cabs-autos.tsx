import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentCard } from '@/components/ContentCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

const FUTURE_FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'call-outline', label: 'One-tap Call Driver' },
  { icon: 'car-outline', label: 'Auto & Cab Directory' },
  { icon: 'shield-checkmark-outline', label: 'Verified Drivers' },
  { icon: 'location-outline', label: 'Areas Served' },
  { icon: 'information-circle-outline', label: 'Vehicle Details' },
  { icon: 'star-outline', label: 'Featured Drivers' },
  { icon: 'search-outline', label: 'Search & Filter' },
  { icon: 'heart-outline', label: 'Save Favorite Drivers' },
];

export default function CabsAutosScreen() {
  const theme = useThemeColors();

  debugListKeys('CabsAutosScreen', 'futureFeatures', FUTURE_FEATURES, (feature) => feature.label);

  return (
    <ScreenShell hideTitle subtitle="Local transportation directory">
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="car-sport-outline" size={36} color={theme.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Cabs & Autos</Text>
        <Text style={[styles.heroBody, { color: theme.textMuted }]}>
          Find verified auto and cab drivers serving IIT Jodhpur. Browse driver contacts, call
          directly, and discover trusted local transportation options.
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.secondaryTint }]}>
          <Ionicons name="time-outline" size={14} color={theme.secondary} />
          <Text style={[styles.badgeText, { color: theme.secondary }]}>Coming Soon</Text>
        </View>
      </View>

      <View style={[styles.noteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.noteText, { color: theme.textMuted }]}>
          This feature is currently under development. We are onboarding local auto and cab
          drivers to provide students, faculty, and staff with reliable transportation options.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>What&apos;s coming</Text>
        <View style={styles.featureGrid}>
          {FUTURE_FEATURES.map((feature) => (
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

      <ContentCard title="Are you an Auto or Cab Driver?" subtitle="Interested in joining the IITJ Cabs & Autos Directory? Registration will be available soon.">
        <View style={[styles.ctaButton, { borderColor: theme.border, backgroundColor: theme.chipBackground }]}>
          <Text style={[styles.ctaButtonText, { color: theme.textMuted }]}>Driver Registration</Text>
          <View style={[styles.ctaBadge, { backgroundColor: theme.secondaryTint }]}>
            <Text style={[styles.ctaBadgeText, { color: theme.secondary }]}>Coming Soon</Text>
          </View>
        </View>
      </ContentCard>
    </ScreenShell>
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
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  ctaButtonText: { ...AppTypography.button },
  ctaBadge: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  ctaBadgeText: { ...AppTypography.caption, fontWeight: '600' },
});
