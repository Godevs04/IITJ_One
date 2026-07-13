import { router } from 'expo-router';
import { View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import { AppSpacing } from '@/theme/tokens';

const MORE_LINKS = [
  { title: 'Campus Map', route: '/map' as const },
  { title: 'Essential Portals', route: '/portals' as const },
  { title: 'Campus Services', route: '/services' as const },
  { title: 'Internet & Wi-Fi', route: '/wifi' as const },
  { title: 'Emergency Contacts', route: '/emergency' as const },
  { title: 'About IITJ', route: '/about' as const },
  { title: 'Settings', route: '/settings' as const },
  { title: 'My Mess QR', route: '/mess-qr' as const },
  { title: 'My Timetable', route: '/timetable' as const },
  { title: 'Notes', route: '/notes' as const },
  { title: 'Suggest Something', route: '/suggest' as const },
];

export default function MoreScreen() {
  return (
    <ScreenShell title="More" subtitle="Campus tools and settings">
      <View style={{ gap: AppSpacing.sm }}>
        {MORE_LINKS.map((item) => (
          <DirectoryRow
            key={item.route}
            title={item.title}
            onPress={() => router.push(item.route)}
          />
        ))}
      </View>
    </ScreenShell>
  );
}
