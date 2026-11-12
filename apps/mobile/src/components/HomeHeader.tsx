import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';

type IconName = keyof typeof MaterialIcons.glyphMap;

const ACTIONS: { icon: IconName; label: string; onPress: () => void }[] = [
  { icon: 'search', label: 'Search', onPress: () => router.push('/search') },
  { icon: 'notifications-none', label: 'Notices', onPress: () => router.push('/(tabs)/notices') },
  { icon: 'settings', label: 'Settings', onPress: () => router.push('/settings') },
];

export function HomeHeader() {
  const theme = useThemeColors();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.headerBackground }}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.headerTint }]} accessibilityRole="header">
          IITJ One
        </Text>
        <View style={styles.actions}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.icon}
              onPress={action.onPress}
              hitSlop={4}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <MaterialIcons name={action.icon} size={22} color={theme.headerTint} />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 64,
    paddingHorizontal: AppSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...AppTypography.display,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
