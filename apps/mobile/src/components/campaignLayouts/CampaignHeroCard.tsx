import { View } from 'react-native';
import { DiscoverCampaignCard } from '@/components/DiscoverCampaignCard';
import type { CampaignDoc } from '@/types/campus';

interface CampaignHeroCardProps {
  /** Pre-sorted by priority — this layout is a single, full-width spotlight for the top campaign. */
  campaigns: CampaignDoc[];
}

/** A single prominent, full-width spotlight — reuses the existing Discover card at full width instead of the Discover list's fixed-width teaser size. */
export function CampaignHeroCard({ campaigns }: CampaignHeroCardProps) {
  const campaign = campaigns[0];
  if (!campaign) return null;

  return (
    <View>
      <DiscoverCampaignCard campaign={campaign} />
    </View>
  );
}
