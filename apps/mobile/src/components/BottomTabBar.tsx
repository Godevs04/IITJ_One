import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useSegments } from 'expo-router';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

type IconName = keyof typeof Ionicons.glyphMap;

/** Icon per route name — keep in sync with the `(tabs)` screen files. */
const TAB_ICONS: Record<string, { inactive: IconName; active: IconName }> = {
  index: { inactive: 'home-outline', active: 'home' },
  menu: { inactive: 'restaurant-outline', active: 'restaurant' },
  notices: { inactive: 'megaphone-outline', active: 'megaphone' },
  transport: { inactive: 'bus-outline', active: 'bus' },
  more: { inactive: 'grid-outline', active: 'grid' },
};

/** Resolve active tab from expo-router segments (reliable with custom tab bar). */
function activeRouteFromSegments(segments: string[]): string | null {
  if (segments[0] !== '(tabs)') return null;
  return (segments[1] as string | undefined) ?? 'index';
}

export function BottomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  const activeRouteName = useMemo(() => {
    const fromSegments = activeRouteFromSegments(segments as string[]);
    if (fromSegments) return fromSegments;
    return state.routes[state.index]?.name ?? 'index';
  }, [segments, state.index, state.routes]);

  debugListKeys('BottomTabBar', 'routes', state.routes, (route) => route.key);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, AppSpacing.xs),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.title === 'string' ? options.title : route.name;
        const isFocused =
          route.name === activeRouteName || state.routes[state.index]?.key === route.key;
        const icons = TAB_ICONS[route.name] ?? {
          inactive: 'ellipse-outline' as IconName,
          active: 'ellipse' as IconName,
        };
        const iconName = isFocused ? icons.active : icons.inactive;
        const color = isFocused ? theme.tabActive : theme.tabInactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
          >
            <View
              style={[
                styles.iconWrap,
                isFocused && {
                  backgroundColor: theme.primaryTint,
                },
              ]}
            >
              <Ionicons name={iconName} size={22} color={color} />
            </View>
            <Text
              style={[
                styles.label,
                { color },
                isFocused && styles.labelActive,
              ]}
            >
              {label}
            </Text>
            {isFocused ? (
              <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
            ) : (
              <View style={styles.activeDotPlaceholder} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: AppSpacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  activeDotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 1,
  },
});
