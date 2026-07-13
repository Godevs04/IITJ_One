import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ContentCard } from '@/components/ContentCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { AboutDoc } from '@/types/campus';
import { AppColors, AppSpacing, AppTypography } from '@/theme/tokens';

const DISCLAIMER =
  'IITJ1 is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.';

export default function AboutScreen() {
  const { syncing, sync } = useCampusSync(false);
  const about = readCachedModule<AboutDoc>('about');
  const sections = about?.sections ?? [];

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      title="About IITJ"
      subtitle="Campus information"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
      </View>

      {sections.length > 0 ? (
        sections.map((section) => (
          <ContentCard key={section.title} title={section.title}>
            <Text style={styles.body}>{section.body}</Text>
          </ContentCard>
        ))
      ) : (
        <EmptyState
          icon="information-circle-outline"
          title="About content loading"
          message="Pull down to sync about sections."
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    backgroundColor: AppColors.indigoTint,
    borderRadius: 12,
    padding: AppSpacing.md,
  },
  disclaimerText: {
    ...AppTypography.bodySmall,
    color: AppColors.jodhpurIndigo,
  },
  body: {
    ...AppTypography.body,
    color: AppColors.inkSlate,
  },
});
