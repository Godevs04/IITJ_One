import { API_BASE_URL } from './api';
import { Analytics, AppEvents } from './firebase';
import { getOrCreateDeviceId } from './firebase/deviceId';
import type { CampaignDoc } from '@/types/campus';

export type CampaignTrackAction = 'view' | 'click' | 'open' | 'dismiss' | 'cta_click';

const EVENT_NAMES: Record<CampaignTrackAction, string> = {
  view: AppEvents.CAMPAIGN_VIEWED,
  click: AppEvents.CAMPAIGN_CLICKED,
  open: AppEvents.CAMPAIGN_OPENED,
  dismiss: AppEvents.CAMPAIGN_DISMISSED,
  cta_click: AppEvents.CAMPAIGN_CTA_CLICKED,
};

// Only these two actions have a dedicated rollup counter on the campaign doc
// itself (impressionCount/clickCount — see packages/types/src/campaigns.ts).
// Everything else is captured only through the generic event below.
const COUNTER_ACTION: Partial<Record<CampaignTrackAction, 'view' | 'click'>> = {
  view: 'view',
  click: 'click',
};

type TrackableCampaign = Pick<CampaignDoc, '_id' | 'category' | 'placement' | 'displayType' | 'trackingId'>;

/**
 * Fires a Discover/Campaign interaction through the existing analytics pipeline
 * (Analytics.trackEvent — dual-fires Firebase Analytics and the backend
 * AnalyticsEventDoc pipeline, see trackingApi.ts) and, for view/click, also
 * best-effort increments the campaign's own impressionCount/clickCount via the
 * lightweight public tracking endpoint. This is the single call site for all
 * campaign tracking — every layout/screen should call this, not fire events ad hoc.
 */
export function trackCampaignEvent(
  campaign: TrackableCampaign,
  action: CampaignTrackAction,
  extra?: Record<string, string>,
): void {
  if (!campaign._id) return;

  Analytics.trackEvent(EVENT_NAMES[action], {
    campaign_id: campaign._id,
    category: campaign.category ?? '',
    placement: campaign.placement,
    display_type: campaign.displayType,
    ...(campaign.trackingId ? { tracking_id: campaign.trackingId } : {}),
    ...extra,
  });

  const counterAction = COUNTER_ACTION[action];
  if (!counterAction) return;
  fetch(`${API_BASE_URL}/campaigns/${campaign._id}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // deviceId (already generated for FCM registration, see firebase/deviceId.ts)
    // lets the backend collapse rapid duplicate fires from the same device
    // into one count — see incrementCampaignMetric's dedupe window.
    body: JSON.stringify({ action: counterAction, deviceId: getOrCreateDeviceId() }),
  }).catch(() => {
    // Best-effort — a missed impression/click counter isn't worth retry logic.
  });
}
