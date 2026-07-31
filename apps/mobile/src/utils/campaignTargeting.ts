import { isVersionSupported } from '@/hooks/useRemoteConfig';
import { currentAppVersion } from '@/services/analytics/backendAnalytics';
import type { CampaignDoc } from '@/types/campus';

/**
 * "App update campaigns" (Phase 6): a campaign can restrict itself to a range of
 * app versions via targeting.minAppVersion/maxAppVersion — e.g. an "Update now"
 * campaign targeted with a maxAppVersion so only outdated installs see it, or a
 * "What's new" changelog campaign targeted with a minAppVersion so only installs
 * that already updated see it. Reuses the same comparator already built for the
 * min-supported-version gate (useRemoteConfig.ts's isVersionSupported) for both
 * bounds, rather than writing a second version comparator.
 */
export function matchesAppVersionTargeting(campaign: Pick<CampaignDoc, 'targeting'>): boolean {
  const { minAppVersion, maxAppVersion } = campaign.targeting ?? {};
  const current = currentAppVersion();
  if (minAppVersion && !isVersionSupported(current, minAppVersion)) return false;
  if (maxAppVersion && !isVersionSupported(maxAppVersion, current)) return false;
  return true;
}
