import { ScrollView, StyleSheet, View } from 'react-native';
import { DiscoverCampaignCard } from '@/components/DiscoverCampaignCard';
import { AppSpacing } from '@/theme/tokens';
import type { CampaignDoc } from '@/types/campus';

interface CampaignCarouselProps {
  /** Pre-sorted by priority — every campaign in this displayType renders as a horizontally swipeable strip. */
  campaigns: CampaignDoc[];
}

/** Horizontally swipeable strip of Discover cards — the same mechanism the Home "Discover" teaser has used since Phase 3. */
export function CampaignCarousel({ campaigns }: CampaignCarouselProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {campaigns.map((c) => (
        <View key={c._id} style={styles.cell}>
          <DiscoverCampaignCard campaign={c} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: AppSpacing.md,
  },
  cell: {
    width: 240,
  },
});
