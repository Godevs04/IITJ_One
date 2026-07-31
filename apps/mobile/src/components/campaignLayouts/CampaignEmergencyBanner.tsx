import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { openCampaignDetails } from '@/utils/campaignNav';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';

interface CampaignEmergencyBannerProps {
  /** Pre-sorted by priority — this layout is a single, unmissable alert for the top campaign. */
  campaigns: CampaignDoc[];
}

/**
 * High-priority alert banner — the dedicated treatment for `displayType: 'fullscreen'`
 * (repurposed from its earlier Hero Card fallback; no schema change, that enum value
 * already existed and was unused for anything distinct). Deliberately not dismissible —
 * unlike Toast, an emergency shouldn't be swept away without being read — and uses the
 * theme's error colors rather than the brand accent, so it reads as categorically
 * different from a routine promotion, not just another card at higher priority.
 */
export function CampaignEmergencyBanner({ campaigns }: CampaignEmergencyBannerProps) {
  const theme = useThemeColors();
  const campaign = campaigns[0];

  useEffect(() => {
    if (campaign) trackCampaignEvent(campaign, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?._id]);

  if (!campaign) return null;

  return (
    <Pressable
      onPress={() => openCampaignDetails(campaign)}
      accessibilityRole="button"
      accessibilityLabel={`Emergency alert: ${campaign.title}`}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: theme.errorTint, borderColor: theme.error },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="warning" size={24} color={theme.error} />
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: theme.error }]}>EMERGENCY</Text>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {campaign.title}
        </Text>
        {campaign.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={2}>
            {campaign.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.error} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 2,
    padding: AppSpacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...AppTypography.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  subtitle: {
    ...AppTypography.bodySmall,
  },
});
