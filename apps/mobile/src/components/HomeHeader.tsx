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
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={8}
          style={styles.action}
        >
          <Ionicons name="settings-outline" size={22} color={theme.headerTint} />
        </Pressable>
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
  action: {
    padding: 4,
  },
});
