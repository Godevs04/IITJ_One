import * as Linking from 'expo-linking';
import { useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { DEFAULT_WIFI_DOC, type WifiGuide } from '@iitj1/types';
import type { WifiDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

async function openPdf(url: string, title: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Open Link', `Unable to open the ${title} guide. Try again later.`);
    }
  } catch {
    Alert.alert('Error', `Something went wrong while opening the ${title} guide.`);
  }
}

function resolveIcon(name?: string): IoniconName {
  if (name && name in Ionicons.glyphMap) return name as IoniconName;
  return 'document-outline';
}

function InfoChip({ label }: { label: string }) {
  const theme = useThemeColors();
  return (
    <View
      style={[styles.chip, { backgroundColor: theme.primaryTint, borderColor: theme.border }]}
    >
      <Text style={[styles.chipText, { color: theme.primary }]}>{label}</Text>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const theme = useThemeColors();
  return <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{text}</Text>;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IoniconName;
  label: string;
  value: string;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: theme.primaryTint }]}>
        <Ionicons name={icon} size={16} color={theme.primary} />
      </View>
      <View style={styles.infoTextBlock}>
        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function GuideCard({ guide }: { guide: WifiGuide }) {
  const theme = useThemeColors();
  return (
    <View style={[styles.guideCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.guideCardHeader}>
        <View style={[styles.guideIconWrap, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name={resolveIcon(guide.icon)} size={22} color={theme.primary} />
        </View>
        <View style={styles.guideTitleBlock}>
          <Text style={[styles.guideTitle, { color: theme.text }]}>{guide.title}</Text>
          <Text style={[styles.guideDesc, { color: theme.textMuted }]} numberOfLines={2}>
            {guide.description}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => openPdf(guide.pdfUrl, guide.title)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${guide.title} PDF`}
        style={({ pressed }) => [
          styles.openButton,
          { backgroundColor: theme.primary, opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <Ionicons name="open-outline" size={15} color={theme.onPrimary} />
        <Text style={[styles.openButtonText, { color: theme.onPrimary }]}>Open Official PDF</Text>
      </Pressable>
    </View>
  );
}

export default function WifiScreen() {
  const theme = useThemeColors();
  const { syncing, sync } = useCampusSync(false);
  const wifi = useCampusModule<WifiDoc>('wifi');

  const providers = wifi?.providers?.length ? wifi.providers : DEFAULT_WIFI_DOC.providers;
  const guides = useMemo(() => {
    const list = wifi?.guides?.length ? wifi.guides : DEFAULT_WIFI_DOC.guides;
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [wifi]);
  const notes =
    wifi?.notes ||
    DEFAULT_WIFI_DOC.notes ||
    'Connect to the IIT Jodhpur WPA2-Enterprise Wi-Fi network using your ERP credentials.';

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Official WPA2-Enterprise setup guides"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <View
        style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <View style={styles.infoCardHeader}>
          <View style={[styles.wifiIconWrap, { backgroundColor: theme.primaryTint }]}>
            <Ionicons name="wifi-outline" size={26} color={theme.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Internet Facility</Text>
            <Text style={[styles.speedBadge, { color: theme.primary }]}>
              ✔ Up to 9 Gbps Connectivity
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SectionLabel text="SERVICE PROVIDERS" />
        <View style={styles.chipRow}>
          {providers.map((p) => (
            <InfoChip key={p} label={p} />
          ))}
        </View>

        <InfoRow icon="person-outline" label="Username" value="ERP Username" />
        <InfoRow icon="lock-closed-outline" label="Password" value="ERP Password" />
        <InfoRow icon="shield-outline" label="Security" value="WPA2 Enterprise" />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.infoCardNote, { color: theme.textMuted }]}>{notes}</Text>
      </View>

      <View style={styles.guidesSection}>
        <Text style={[styles.guidesSectionTitle, { color: theme.text }]}>Wi-Fi Setup Guides</Text>
        <Text style={[styles.guidesSectionSub, { color: theme.textMuted }]}>
          Tap a platform to open the official IITJ configuration PDF.
        </Text>
      </View>

      <View style={{ gap: AppSpacing.md }}>
        {guides.map((guide) => (
          <GuideCard key={`${guide.title}-${guide.pdfUrl}`} guide={guide} />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  wifiIconWrap: {
    width: 48,
    height: 48,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  speedBadge: {
    ...AppTypography.bodySmall,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: AppSpacing.xs,
  },
  sectionLabel: {
    ...AppTypography.sectionLabel,
    marginBottom: AppSpacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  chip: {
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 4,
  },
  chipText: {
    ...AppTypography.caption,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextBlock: {
    gap: 1,
  },
  infoLabel: {
    ...AppTypography.caption,
  },
  infoValue: {
    ...AppTypography.body,
    fontWeight: '500',
  },
  infoCardNote: {
    ...AppTypography.bodySmall,
  },
  guidesSection: {
    gap: AppSpacing.xs,
  },
  guidesSectionTitle: {
    ...AppTypography.h1,
    fontWeight: '600',
  },
  guidesSectionSub: {
    ...AppTypography.bodySmall,
  },
  guideCard: {
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.md,
  },
  guideIconWrap: {
    width: 44,
    height: 44,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitleBlock: {
    flex: 1,
    gap: 4,
  },
  guideTitle: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  guideDesc: {
    ...AppTypography.bodySmall,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
  },
  openButtonText: {
    ...AppTypography.button,
  },
});
