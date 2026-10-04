import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useSegments } from 'expo-router';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

type IconName = keyof typeof MaterialIcons.glyphMap;

/** Google Material icon per route name — keep in sync with the `(tabs)` screen files. */
const TAB_ICONS: Record<string, { inactive: IconName; active: IconName }> = {
  index: { inactive: 'home', active: 'home' },
  menu: { inactive: 'restaurant', active: 'restaurant' },
  notices: { inactive: 'campaign', active: 'campaign' },
  transport: { inactive: 'directions-bus', active: 'directions-bus' },
  more: { inactive: 'apps', active: 'apps' },
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

  debugListKeys('BottomTabBar', 'routes', state.routes, (route: any) => route.key);

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
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.title === 'string' ? options.title : route.name;
        const isFocused =
          route.name === activeRouteName || state.routes[state.index]?.key === route.key;
        const icons = TAB_ICONS[route.name] ?? {
          inactive: 'circle' as IconName,
          active: 'circle' as IconName,
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
                  backgroundColor: theme.tabActiveBackground,
                },
              ]}
            >
              <MaterialIcons name={iconName} size={24} color={color} />
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
    minHeight: 56,
  },
  iconWrap: {
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.full,
  },
  label: {
    ...AppTypography.small,
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
});
