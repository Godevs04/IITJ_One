import type { ComponentType } from 'react';
import { CampaignToast } from './CampaignToast';
import { CampaignBanner } from './CampaignBanner';
import { CampaignHeroCard } from './CampaignHeroCard';
import { CampaignCarousel } from './CampaignCarousel';
import { CampaignEmergencyBanner } from './CampaignEmergencyBanner';
import type { CampaignDisplayType, CampaignDoc } from '@/types/campus';

export interface CampaignLayoutProps {
  campaigns: CampaignDoc[];
}

type CampaignLayoutComponent = ComponentType<CampaignLayoutProps>;

/**
 * Single source of truth mapping a campaign's admin-selected `displayType` to the
 * component that renders it on Home, and the fixed order those groups stack in.
 * Adding a future layout is a one-line addition here — nothing else changes.
 * `fullscreen` is the dedicated Emergency alert treatment (highest priority, rendered
 * first) — no schema change was needed, this enum value already existed and previously
 * had no distinct layout of its own.
 */
const HOME_LAYOUT_ORDER: { displayType: CampaignDisplayType; Component: CampaignLayoutComponent }[] = [
  { displayType: 'fullscreen', Component: CampaignEmergencyBanner },
  { displayType: 'popup', Component: CampaignToast },
  { displayType: 'card', Component: CampaignHeroCard },
  { displayType: 'banner', Component: CampaignBanner },
  { displayType: 'carousel', Component: CampaignCarousel },
];

export interface CampaignHomeGroup {
  key: string;
  Component: CampaignLayoutComponent;
  campaigns: CampaignDoc[];
}

/** Splits `home_hero` campaigns into one group per displayType, each sorted by priority, skipping empty groups. */
export function groupCampaignsForHome(campaigns: CampaignDoc[]): CampaignHomeGroup[] {
  const sorted = [...campaigns].sort((a, b) => a.priority - b.priority);
  return HOME_LAYOUT_ORDER
    .map(({ displayType, Component }) => ({
      key: displayType,
      Component,
      campaigns: sorted.filter((c) => c.displayType === displayType),
    }))
    .filter((group) => group.campaigns.length > 0);
}
