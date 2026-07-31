import { Linking } from 'react-native';
import { router } from 'expo-router';
import { isHttpUrl, isSafeDeepLink } from './urlSafety';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';

/** In-app route resolution for `deepLink`/CTA deep_link payloads — bare keys ("menu") become routes ("/menu"). */
function resolveInAppRoute(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

async function openDeepLinkOrRoute(value: string): Promise<void> {
  // isSafeDeepLink/isHttpUrl are `value is string` guards meant for `string | null | undefined`
  // input — against an already-`string` value that predicate narrows the else-branch to
  // `never`, so wrap in Boolean() to get a plain boolean instead of relying on the narrowing.
  if (!Boolean(isSafeDeepLink(value))) return;
  if (Boolean(isHttpUrl(value))) {
    void Linking.openURL(value);
    return;
  }
  const canOpenAsScheme = value.includes('://') && (await Linking.canOpenURL(value).catch(() => false));
  if (canOpenAsScheme) {
    void Linking.openURL(value);
    return;
  }
  router.push(resolveInAppRoute(value) as never);
}

/**
 * A single accessibilityLabel summarizing a campaign card the way it reads visually
 * (featured badge, category, title, subtitle) — setting accessibilityLabel on a
 * Pressable hides all descendant Text from screen readers unless the label itself
 * carries that context, so every card-shaped layout builds its label from this.
 */
export function campaignAccessibilityLabel(
  campaign: Pick<CampaignDoc, 'title' | 'subtitle' | 'category' | 'featured'>,
): string {
  const parts: string[] = [];
  if (campaign.featured) parts.push('Featured');
  if (campaign.category) parts.push(campaign.category);
  parts.push(campaign.title);
  if (campaign.subtitle) parts.push(campaign.subtitle);
  return parts.join('. ');
}

/**
 * Executes a campaign's CTA button action (phone/whatsapp/link/payment/survey/deep_link)
 * and fires the shared "CTA click" tracking event — the single place both the Discover
 * card and the Campaign Details page trigger a CTA from (Phase 6: previously duplicated
 * as `runCta`/`runCtaAction` in two files).
 */
export function runCampaignCta(campaign: CampaignDoc): void {
  const cta = campaign.cta;
  if (!cta || cta.actionType === 'none') return;
  trackCampaignEvent(campaign, 'cta_click', { action_type: cta.actionType });

  const { actionType, payload } = cta;
  switch (actionType) {
    case 'phone':
      void Linking.openURL(`tel:${payload}`);
      return;
    case 'whatsapp':
      void Linking.openURL(`whatsapp://send?phone=${encodeURIComponent(payload)}`);
      return;
    case 'deep_link':
      void openDeepLinkOrRoute(payload);
      return;
    default:
      if (isHttpUrl(payload)) void Linking.openURL(payload);
      return;
  }
}
