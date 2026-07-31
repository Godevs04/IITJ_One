import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { openCampaignDetails } from '@/utils/campaignNav';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';

interface CampaignToastProps {
  /** Pre-sorted by priority — this layout shows only the single top campaign at a time. */
  campaigns: CampaignDoc[];
}

/** Slim, dismissible strip for time-sensitive nudges (e.g. "Registration closes tonight"). Dismissal is in-memory only — it reappears next app open, since nothing here is durable enough to warrant persisting a dismissal. */
export function CampaignToast({ campaigns }: CampaignToastProps) {
  const theme = useThemeColors();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const campaign = campaigns.find((c) => c._id && !dismissedIds.has(c._id));
  const id = campaign?._id;

  useEffect(() => {
    if (campaign) trackCampaignEvent(campaign, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!campaign || !id) return null;

  // The dismiss button is a sibling of the tappable body, never nested inside it —
  // see DiscoverCampaignCard for why a Pressable inside a Pressable is invalid.
  return (
    <View style={[styles.toast, { backgroundColor: theme.primaryTint, borderColor: theme.border }]}>
      <Pressable
        onPress={() => openCampaignDetails(campaign)}
        accessibilityRole="button"
        accessibilityLabel={campaign.title}
        accessibilityHint="Opens campaign details"
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Ionicons name="megaphone-outline" size={18} color={theme.linkText} />
        <Text style={[styles.text, { color: theme.text }]} numberOfLines={1}>
          {campaign.title}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.iconMuted} />
      </Pressable>
      <Pressable
        onPress={() => {
          trackCampaignEvent(campaign, 'dismiss');
          setDismissedIds((prev) => new Set(prev).add(id));
        }}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel="Dismiss campaign alert"
        style={styles.dismiss}
      >
        <Ionicons name="close" size={16} color={theme.iconMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  dismiss: {
    paddingLeft: AppSpacing.sm,
  },
});
