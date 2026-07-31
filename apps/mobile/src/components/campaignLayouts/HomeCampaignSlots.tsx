import { StyleSheet, View } from 'react-native';
import { AppSpacing } from '@/theme/tokens';
import { groupCampaignsForHome } from './registry';
import type { CampaignDoc } from '@/types/campus';

interface HomeCampaignSlotsProps {
  /** Should already be filtered to `placement === 'home_hero'` — see Home screen. */
  campaigns: CampaignDoc[];
}

/** Renders each Home-placed campaign via the layout its admin-selected `displayType` maps to — see registry.tsx. */
export function HomeCampaignSlots({ campaigns }: HomeCampaignSlotsProps) {
  const groups = groupCampaignsForHome(campaigns);
  if (groups.length === 0) return null;

  return (
    <View style={styles.stack}>
      {groups.map((group) => (
        <group.Component key={group.key} campaigns={group.campaigns} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: AppSpacing.md,
  },
});
