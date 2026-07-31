import { useEffect, useMemo } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@/components/ScreenShell';
import { EmptyState } from '@/components/EmptyState';
import { CampaignGallery } from '@/components/CampaignGallery';
import { DiscoverCampaignCard } from '@/components/DiscoverCampaignCard';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useBookmark } from '@/services/bookmarks';
import { isHttpUrl } from '@/utils/urlSafety';
import { runCampaignCta } from '@/utils/campaignActions';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface ContactAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function buildContactActions(campaign: CampaignDoc): ContactAction[] {
  const links = campaign.links;
  if (!links) return [];
  const fire = (contactType: string) => trackCampaignEvent(campaign, 'cta_click', { contact_type: contactType });
  const actions: ContactAction[] = [];
  if (links.website && isHttpUrl(links.website)) {
    actions.push({ icon: 'globe-outline', label: 'Website', onPress: () => { fire('website'); Linking.openURL(links.website!); } });
  }
  if (links.phone) {
    actions.push({ icon: 'call-outline', label: 'Call', onPress: () => { fire('phone'); Linking.openURL(`tel:${links.phone}`); } });
  }
  if (links.whatsapp) {
    actions.push({
      icon: 'logo-whatsapp',
      label: 'WhatsApp',
      onPress: () => { fire('whatsapp'); Linking.openURL(`whatsapp://send?phone=${encodeURIComponent(links.whatsapp!)}`); },
    });
  }
  if (links.instagram && isHttpUrl(links.instagram)) {
    actions.push({ icon: 'logo-instagram', label: 'Instagram', onPress: () => { fire('instagram'); Linking.openURL(links.instagram!); } });
  }
  if (links.email) {
    actions.push({ icon: 'mail-outline', label: 'Email', onPress: () => { fire('email'); Linking.openURL(`mailto:${links.email}`); } });
  }
  if (links.locationUrl && isHttpUrl(links.locationUrl)) {
    actions.push({ icon: 'location-outline', label: 'Location', onPress: () => { fire('location'); Linking.openURL(links.locationUrl!); } });
  }
  return actions;
}

/** Splits on blank lines so plain-text `description` reads as real paragraphs — the "rich content" treatment for Phase 4, without a new schema field. */
function renderParagraphs(text: string, color: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph, i) => (
      <Text key={i} style={[styles.paragraph, { color }]}>
        {paragraph}
      </Text>
    ));
}

export default function CampaignDetailsScreen() {
  const theme = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { syncing, sync, error: syncError } = useCampusSync();
  const campaigns = useCampusModule<CampaignDoc[]>('campaigns');
  const { bookmarked, toggle } = useBookmark(id);

  const campaign = useMemo(() => campaigns?.find((c) => c._id === id) ?? null, [campaigns, id]);

  const related = useMemo(() => {
    if (!campaign) return [];
    return (campaigns ?? [])
      .filter((c) => c._id !== campaign._id && c.category && c.category === campaign.category)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5);
  }, [campaigns, campaign]);

  const contactActions = campaign ? buildContactActions(campaign) : [];
  const images = campaign?.visuals?.images?.length ? campaign.visuals.images : campaign?.visuals?.imageUrl ? [campaign.visuals.imageUrl] : [];

  // "Opens" tracks every visit to this screen regardless of entry point (card
  // tap, push notification, deep link, or a related-campaigns link on another
  // Details page) — independent of the "click" event fired by whatever navigated here.
  useEffect(() => {
    if (campaign) trackCampaignEvent(campaign, 'open');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?._id]);

  async function onShare() {
    if (!campaign) return;
    const url = campaign.externalLink && isHttpUrl(campaign.externalLink) ? campaign.externalLink : undefined;
    try {
      await Share.share({
        title: campaign.title,
        message: url ? `${campaign.title}\n${campaign.subtitle ?? ''}\n${url}`.trim() : `${campaign.title}\n${campaign.subtitle ?? ''}`.trim(),
        ...(url ? { url } : {}),
      });
    } catch {
      // User cancelled or share failed silently — not worth surfacing an error for.
    }
  }

  if (campaigns === null && syncing) {
    return (
      <ScreenShell hideTitle onRefresh={sync} refreshing={syncing}>
        <View style={{ height: 240, borderRadius: AppRadius.lg, backgroundColor: theme.surfaceMuted }} />
      </ScreenShell>
    );
  }

  if (!campaign) {
    return (
      <ScreenShell hideTitle onRefresh={sync} refreshing={syncing} error={syncError}>
        <Stack.Screen options={{ title: 'Campaign' }} />
        <EmptyState
          icon="compass-outline"
          title="Campaign not found"
          message="It may have expired or been removed. Pull down to refresh."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell hideTitle onRefresh={sync} refreshing={syncing} error={syncError}>
      <Stack.Screen
        options={{
          title: campaign.title,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => void onShare()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Share campaign">
                <Ionicons name="share-outline" size={22} color={theme.text} />
              </Pressable>
              <Pressable onPress={toggle} hitSlop={12} accessibilityRole="button" accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark'} accessibilityState={{ selected: bookmarked }}>
                <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={theme.text} />
              </Pressable>
            </View>
          ),
        }}
      />

      {images.length > 0 ? (
        <View style={styles.galleryWrap}>
          <CampaignGallery images={images} themeColor={campaign.visuals?.themeColor} />
        </View>
      ) : null}

      <View style={styles.badgeRow}>
        {campaign.category ? (
          <View style={[styles.badge, { backgroundColor: theme.primaryTint }]}>
            <Text style={[styles.badgeText, { color: theme.linkText }]}>{campaign.category}</Text>
          </View>
        ) : null}
        {campaign.featured ? (
          <View style={[styles.badge, { backgroundColor: theme.secondaryTint }]}>
            <Ionicons name="star" size={11} color={theme.secondary} />
            <Text style={[styles.badgeText, { color: theme.secondary }]}>Featured</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{campaign.title}</Text>
      {campaign.subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{campaign.subtitle}</Text> : null}

      {campaign.description ? (
        <View style={styles.section}>{renderParagraphs(campaign.description, theme.text)}</View>
      ) : null}

      {campaign.tags && campaign.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {campaign.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: theme.chipBackground, borderColor: theme.border }]}>
              <Text style={[styles.tagText, { color: theme.chipText }]}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {campaign.cta ? (
        <Pressable
          onPress={() => runCampaignCta(campaign)}
          accessibilityRole="button"
          accessibilityLabel={campaign.cta.label}
          style={({ pressed }) => [styles.ctaButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}
        >
          <Text style={[styles.ctaButtonText, { color: theme.onPrimary }]}>{campaign.cta.label}</Text>
        </Pressable>
      ) : null}

      {contactActions.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Contact</Text>
          <View style={styles.contactRow}>
            {contactActions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.contactButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={action.icon} size={18} color={theme.linkText} />
                <Text style={[styles.contactButtonText, { color: theme.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {related.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Related</Text>
          <View style={styles.relatedGrid}>
            {related.map((c) => (
              <DiscoverCampaignCard key={c._id} campaign={c} />
            ))}
          </View>
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: AppSpacing.lg,
    paddingRight: AppSpacing.xs,
  },
  galleryWrap: {
    marginHorizontal: -AppSpacing.lg,
    marginTop: -AppSpacing.lg,
    borderRadius: 0,
    overflow: 'hidden',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: AppSpacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    ...AppTypography.caption,
    fontWeight: '700',
  },
  title: {
    ...AppTypography.display,
  },
  subtitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  section: {
    gap: AppSpacing.sm,
  },
  sectionLabel: {
    ...AppTypography.sectionLabel,
  },
  paragraph: {
    ...AppTypography.body,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.xs,
  },
  tag: {
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    ...AppTypography.caption,
  },
  ctaButton: {
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  ctaButtonText: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
  },
  contactButtonText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  relatedGrid: {
    gap: AppSpacing.md,
  },
});
