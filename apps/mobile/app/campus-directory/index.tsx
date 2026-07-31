import { router, type Href } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickAccessTile } from '@/components/QuickAccessTile';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

interface DirectoryCard {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: Href;
}

const CARDS: DirectoryCard[] = [
  { title: 'Leadership', icon: 'ribbon-outline', route: '/campus-directory/leadership' },
  { title: 'Departments', icon: 'business-outline', route: '/campus-directory/departments' },
  { title: 'Faculty', icon: 'school-outline', route: '/campus-directory/faculty' },
  { title: 'Administration', icon: 'briefcase-outline', route: '/campus-directory/administration' },
  { title: 'Clubs & Societies', icon: 'people-outline', route: '/campus-directory/clubs' },
  { title: 'Student Council', icon: 'megaphone-outline', route: '/campus-directory/student-council' },
  { title: 'Offices & Cells', icon: 'file-tray-full-outline', route: '/campus-directory/offices' },
];

export default function CampusDirectoryScreen() {
  const theme = useThemeColors();

  debugListKeys('CampusDirectoryScreen', 'cards', CARDS, (card) => card.title);

  return (
    <ScreenShell hideTitle subtitle="Find people, departments, and organizations across IIT Jodhpur.">
      <Pressable
        onPress={() => router.push('/campus-directory/search')}
        style={({ pressed }) => [
          styles.searchRow,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Search Campus Directory"
      >
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <Text style={[styles.searchText, { color: theme.textMuted }]}>
          Search people, departments, organizations…
        </Text>
      </Pressable>

      <View style={styles.grid}>
        {CARDS.map((card) => (
          <QuickAccessTile
            key={card.title}
            title={card.title}
            icon={card.icon}
            onPress={() => router.push(card.route)}
          />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  searchText: {
    ...AppTypography.body,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
