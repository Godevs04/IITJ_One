import { router, type Href } from 'expo-router';
import { type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickAccessTile, type QuickAccessVariant } from '@/components/QuickAccessTile';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';

interface MoreLink {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: Href;
  variant?: QuickAccessVariant;
}

interface MoreSection {
  title: string;
  links: MoreLink[];
}

const SECTIONS: MoreSection[] = [
  {
    title: 'Campus tools',
    links: [
      { title: 'Campus Map', icon: 'map-outline', route: '/map' },
      { title: 'Academic Calendar', icon: 'calendar-outline', route: '/calendar' },
      { title: 'Campus Apps', icon: 'apps-outline', route: '/apps' },
      { title: 'Essential Portals', icon: 'link-outline', route: '/portals' },
      { title: 'Campus Services', icon: 'construct-outline', route: '/services' },
      { title: 'Internet & Wi-Fi', icon: 'wifi-outline', route: '/wifi' },
      { title: 'Laundry', icon: 'shirt-outline', route: '/laundry' },
      { title: 'E-Rickshaw', icon: 'car-sport-outline', route: '/e-rickshaw' },
      { title: 'Cabs & Autos', icon: 'car-outline', route: '/cabs-autos' },
      { title: 'Emergency Contacts', icon: 'alert-circle-outline', route: '/emergency', variant: 'danger' },
    ],
  },
  {
    title: 'My space',
    links: [
      { title: 'My Mess QR', icon: 'qr-code-outline', route: '/mess-qr', variant: 'prominent' },
      { title: 'My Timetable', icon: 'calendar-outline', route: '/timetable' },
      { title: 'Notes', icon: 'document-text-outline', route: '/notes' },
    ],
  },
  {
    title: 'Settings & support',
    links: [
      { title: 'Settings', icon: 'settings-outline', route: '/settings' },
      { title: 'Suggest Something', icon: 'bulb-outline', route: '/suggest' },
      { title: 'About IITJ One', icon: 'information-circle-outline', route: '/about' },
    ],
  },
];

export default function MoreScreen() {
  const theme = useThemeColors();

  return (
    <ScreenShell title="More" subtitle="Campus tools and settings">
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
            {section.title}
          </Text>
          <View style={styles.grid}>
            {section.links.map((item) => (
              <QuickAccessTile
                key={item.title}
                title={item.title}
                icon={item.icon}
                variant={item.variant}
                onPress={() => router.push(item.route)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: AppSpacing.md },
  sectionTitle: { ...AppTypography.sectionLabel },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
