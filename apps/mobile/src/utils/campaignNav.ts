import { router } from 'expo-router';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';

/**
 * Every campaign layout (card, toast, banner, hero, carousel) navigates here on
 * tap — the single source of truth for "open Campaign Details," and where the
 * "click" tracking event fires (Phase 6).
 */
export function openCampaignDetails(
  campaign: Pick<CampaignDoc, '_id' | 'category' | 'placement' | 'displayType' | 'trackingId'>,
): void {
  if (!campaign._id) return;
  trackCampaignEvent(campaign, 'click');
  router.push(`/discover/${campaign._id}` as never);
}
