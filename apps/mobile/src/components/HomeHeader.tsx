import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getUnreadCount } from '@/services/firebase';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppTypography, spacing } from '@/theme/tokens';

/**
 * Home header (Screen 01 §3): who is using the app on the left, the notification bell on the right.
 * IITJ One has no student accounts yet, so the user is "Guest"; that side opens More (settings, tools).
 * The bell's dot reflects unread push notifications and clears once Notices has been opened.
 */
export function HomeHeader() {
  const theme = useThemeColors();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setUnread(getUnreadCount());
    }, []),
  );

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.headerBackground }}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push('/more')}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Guest. Open settings and more"
          style={({ pressed }) => [styles.user, pressed && styles.pressed]}
        >
          <View style={[styles.circle, { borderColor: theme.headerTint }]}>
            <MaterialIcons name="person-outline" size={24} color={theme.headerTint} />
          </View>
          <Text style={[styles.name, { color: theme.headerTint }]} accessibilityRole="header">
            Guest
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/notices')}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          style={({ pressed }) => [styles.circle, { borderColor: theme.headerTint }, pressed && styles.pressed]}
        >
          <MaterialIcons name="notifications-none" size={24} color={theme.headerTint} />
          {unread > 0 ? (
            <View style={[styles.dot, { backgroundColor: theme.error, borderColor: theme.headerBackground }]} />
          ) : null}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 64,
    paddingHorizontal: spacing.screenMargin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...AppTypography.display,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
