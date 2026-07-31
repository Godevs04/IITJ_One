import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { openCampaignDetails } from '@/utils/campaignNav';
import { campaignAccessibilityLabel } from '@/utils/campaignActions';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';

interface CampaignBannerProps {
  /** Pre-sorted by priority — every campaign in this displayType renders, stacked. */
  campaigns: CampaignDoc[];
}

/** Full-width promotional strip(s) — a thumbnail beside title/subtitle. Multiple banners stack vertically. */
export function CampaignBanner({ campaigns }: CampaignBannerProps) {
  return (
    <View style={styles.stack}>
      {campaigns.map((campaign) => (campaign._id ? <BannerItem key={campaign._id} campaign={campaign} /> : null))}
    </View>
  );
}

function BannerItem({ campaign }: { campaign: CampaignDoc }) {
  const theme = useThemeColors();
  const image = campaign.visuals?.images?.[0] || campaign.visuals?.imageUrl;

  // Each banner is its own component so it can track its own view on mount —
  // hooks can't be called conditionally inside the parent's .map() callback.
  useEffect(() => {
    trackCampaignEvent(campaign, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign._id]);

  return (
    <Pressable
      onPress={() => openCampaignDetails(campaign)}
      accessibilityRole="button"
      accessibilityLabel={campaignAccessibilityLabel(campaign)}
      accessibilityHint="Opens campaign details"
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: campaign.visuals?.themeColor || theme.surfaceMuted }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <Ionicons name="megaphone-outline" size={22} color={theme.iconMuted} />
        )}
      </View>
      <View style={styles.textBlock}>
        {campaign.category ? (
          <Text style={[styles.category, { color: theme.linkText }]} numberOfLines={1}>
            {campaign.category.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {campaign.title}
        </Text>
        {campaign.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {campaign.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: AppSpacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  category: {
    ...AppTypography.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  subtitle: {
    ...AppTypography.bodySmall,
  },
});
