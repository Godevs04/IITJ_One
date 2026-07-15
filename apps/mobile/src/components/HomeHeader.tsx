import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing } from '@/theme/tokens';

export function HomeHeader() {
  const theme = useThemeColors();

  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: theme.headerBackground }}
    >
      <View style={[styles.row, { backgroundColor: theme.headerBackground }]}>
        <Text style={[styles.title, { color: theme.headerTint }]}>
          IITJ one
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/search')}
            hitSlop={8}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Ionicons name="search-outline" size={22} color={theme.headerTint} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={theme.headerTint} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    paddingHorizontal: AppSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  action: {
    padding: 4,
  },
});
