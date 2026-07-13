import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

// ─── Data model ──────────────────────────────────────────────────────────────
interface PlatformGuide {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description: string;
  pdfUrl: string;
}

const PLATFORM_GUIDES: PlatformGuide[] = [
  {
    title: 'Linux',
    icon: 'terminal-outline',
    description: 'Official WPA2-Enterprise Wi-Fi configuration guide for Linux devices.',
    pdfUrl: 'https://iitj.ac.in/PageImages/Gallery/01-2025/internet-linux-638738366727934551.pdf',
  },
  {
    title: 'Windows',
    icon: 'desktop-outline',
    description: 'Official WPA2-Enterprise Wi-Fi configuration guide for Windows devices.',
    pdfUrl:
      'https://iitj.ac.in/PageImages/Gallery/01-2025/Internet-window-638738369547845162.pdf',
  },
  {
    title: 'macOS',
    icon: 'laptop-outline',
    description: 'Official WPA2-Enterprise Wi-Fi configuration guide for macOS devices.',
    pdfUrl: 'https://iitj.ac.in/PageImages/Gallery/01-2025/Internet-mac-638738370188410589.pdf',
  },
  {
    title: 'Android',
    icon: 'phone-portrait-outline',
    description: 'Official IITJ WPA2-Enterprise Wi-Fi configuration guide for Android devices.',
    pdfUrl:
      'https://iitj.ac.in/PageImages/Gallery/09-2025/IITJWLAN-configuration-steps-for-Android-User-638944967480274395.pdf',
  },
  {
    title: 'Certificate',
    icon: 'shield-checkmark-outline',
    description: 'Download the official IITJ Wi-Fi certificate if required during device configuration.',
    pdfUrl: 'https://drive.google.com/file/d/1rjTBValxR_6jEIvGDzGYZH13ye7o-VBL/view',
  },
];

const PROVIDERS = ['NKN', 'BSNL', 'Airtel', 'PGCIL'];

// ─── Helper ───────────────────────────────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────
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
  return (
    <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{text}</Text>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
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

function GuideCard({ guide }: { guide: PlatformGuide }) {
  const theme = useThemeColors();
  return (
    <View style={[styles.guideCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.guideCardHeader}>
        <View style={[styles.guideIconWrap, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name={guide.icon} size={22} color={theme.primary} />
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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WifiScreen() {
  const theme = useThemeColors();

  return (
    <ScreenShell hideTitle subtitle="Official WPA2-Enterprise setup guides">
      {/* ── Information card ────────────────────────────────────────────── */}
      <View
        style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        {/* Header row */}
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

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Providers */}
        <SectionLabel text="SERVICE PROVIDERS" />
        <View style={styles.chipRow}>
          {PROVIDERS.map((p) => (
            <InfoChip key={p} label={p} />
          ))}
        </View>

        {/* Auth + Security */}
        <InfoRow icon="person-outline" label="Username" value="ERP Username" />
        <InfoRow icon="lock-closed-outline" label="Password" value="ERP Password" />
        <InfoRow icon="shield-outline" label="Security" value="WPA2 Enterprise" />

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.infoCardNote, { color: theme.textMuted }]}>
          Connect to the IIT Jodhpur WPA2-Enterprise Wi-Fi network using your ERP credentials.
          Follow the official setup guide for your device.
        </Text>
      </View>

      {/* ── Platform setup guides ────────────────────────────────────────── */}
      <View style={styles.guidesSection}>
        <Text style={[styles.guidesSectionTitle, { color: theme.text }]}>Wi-Fi Setup Guides</Text>
        <Text style={[styles.guidesSectionSub, { color: theme.textMuted }]}>
          Tap a platform to open the official IITJ configuration PDF.
        </Text>
      </View>

      <View style={{ gap: AppSpacing.md }}>
        {PLATFORM_GUIDES.map((guide) => (
          <GuideCard key={guide.title} guide={guide} />
        ))}
      </View>
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Info card
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
  // Guides section header
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
  // Guide card
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
