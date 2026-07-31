import { memo, useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { openCampaignDetails } from '@/utils/campaignNav';
import { campaignAccessibilityLabel, runCampaignCta } from '@/utils/campaignActions';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';

interface DiscoverCampaignCardProps {
  campaign: CampaignDoc;
  /**
   * Fire the "view" event on mount (default). Set `false` when the caller
   * tracks visibility itself instead — the Discover list does this via its
   * FlatList's viewability config, so impressions there count only once an
   * item actually scrolls on screen rather than the moment it mounts.
   */
  trackView?: boolean;
}

/** Tapping the card body always opens the Campaign Details page (Phase 4) — the campaign's own
 *  deepLink/externalLink/contact actions live there now, alongside the gallery, related campaigns, etc.
 *  The CTA button below stays a direct-action shortcut, independent of this. */
function runBodyTap(campaign: CampaignDoc) {
  openCampaignDetails(campaign);
}

function DiscoverCampaignCardImpl({ campaign, trackView = true }: DiscoverCampaignCardProps) {
  const theme = useThemeColors();
  const primaryImage = campaign.visuals?.images?.[0] || campaign.visuals?.imageUrl;
  const hasBodyAction = !!campaign._id;

  // Fires once per mount — "shown to the user during this screen visit" is the
  // practical definition of an impression here, since neither the Home slots
  // nor Related Campaigns are virtualized/viewability-tracked (both are small,
  // bounded lists). Skipped when the caller opts into its own tracking (trackView=false).
  useEffect(() => {
    if (trackView) trackCampaignEvent(campaign, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign._id, trackView]);

  // The CTA button is a sibling of the tappable body, never nested inside it —
  // a Pressable-inside-a-Pressable renders as a <button> inside a <button> on
  // web (invalid HTML, causes a hydration warning) and is ambiguous touch
  // handling on native regardless.
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        onPress={hasBodyAction ? () => runBodyTap(campaign) : undefined}
        accessibilityRole={hasBodyAction ? 'button' : undefined}
        accessibilityLabel={campaignAccessibilityLabel(campaign)}
        accessibilityHint={hasBodyAction ? 'Opens campaign details' : undefined}
        style={({ pressed }) => [pressed && hasBodyAction && styles.pressed]}
      >
        <View
          style={[
            styles.imageWrap,
            { backgroundColor: campaign.visuals?.themeColor || theme.surfaceMuted },
          ]}
        >
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="cover" />
          ) : (
            <Ionicons name="megaphone-outline" size={28} color={theme.iconMuted} />
          )}
          {campaign.featured ? (
            <View style={[styles.featuredBadge, { backgroundColor: theme.secondaryTint }]}>
              <Ionicons name="star" size={11} color={theme.secondary} />
              <Text style={[styles.featuredBadgeText, { color: theme.secondary }]}>Featured</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.textBlock}>
          {campaign.category ? (
            <Text style={[styles.category, { color: theme.linkText }]} numberOfLines={1}>
              {campaign.category.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {campaign.title}
          </Text>
          {campaign.subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={2}>
              {campaign.subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {campaign.cta ? (
        <View style={styles.body}>
          <Pressable
            onPress={() => runCampaignCta(campaign)}
            accessibilityRole="button"
            accessibilityLabel={campaign.cta.label}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.ctaButtonText, { color: theme.onPrimary }]}>{campaign.cta.label}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Memoized — Discover's FlatList and Home's small lists both re-render on unrelated state changes (search query, sort order, sync ticks) that don't touch any given card's own campaign data. */
export const DiscoverCampaignCard = memo(DiscoverCampaignCardImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrap: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: AppSpacing.sm,
    left: AppSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
  },
  featuredBadgeText: {
    ...AppTypography.caption,
    fontWeight: '700',
  },
  textBlock: {
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  body: {
    paddingHorizontal: AppSpacing.md,
    paddingBottom: AppSpacing.md,
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
  ctaButton: {
    marginTop: AppSpacing.sm,
    alignSelf: 'flex-start',
    borderRadius: AppRadius.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
  },
  ctaButtonText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
});
