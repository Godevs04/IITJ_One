import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useSegments } from 'expo-router';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, spacing } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * The five primary destinations, in bar order — keep in sync with the `(tabs)` screen files.
 * The bar shows icons only, so `label` is what assistive technology announces.
 */
const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home-outline', label: 'Home' },
  map: { icon: 'map-outline', label: 'Campus Map' },
  search: { icon: 'magnify', label: 'Search' },
  phc: { icon: 'medical-bag', label: 'Primary Health Centre' },
  transport: { icon: 'bus', label: 'Transportation' },
};

const BAR_HEIGHT = 68;
const BORDER_WIDTH = 3;
const CAPSULE_HEIGHT = 44;
const CAPSULE_MAX_WIDTH = 64;
const BAR_MAX_WIDTH = 440;
const INDICATOR_MS = 240;

/** Gap between the pill and the bottom of the screen (or the system navigation area). */
function barBottomOffset(bottomInset: number): number {
  return Math.max(bottomInset, spacing.sm) + spacing.sm;
}

/**
 * Bottom padding a primary screen's scroll content needs so its last items clear the floating bar.
 * Returns 0 on screens outside the tabs, where the bar is not shown.
 */
export function useFloatingTabBarInset(): number {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  if (segments[0] !== '(tabs)') return 0;
  return BAR_HEIGHT + barBottomOffset(insets.bottom) + spacing.md;
}

/** Resolve active tab from expo-router segments (reliable with custom tab bar). */
function activeRouteFromSegments(segments: string[]): string | null {
  if (segments[0] !== '(tabs)') return null;
  return (segments[1] as string | undefined) ?? 'index';
}

/** Low-opacity circles inside the pill — decoration only, kept clear of the icon row's contrast. */
function BackgroundPattern({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <View style={[styles.patternDot, { backgroundColor: color, width: 96, height: 96, left: -28, top: -44 }]} />
      <View style={[styles.patternDot, { backgroundColor: color, width: 72, height: 72, left: '34%', top: 30 }]} />
      <View style={[styles.patternDot, { backgroundColor: color, width: 120, height: 120, right: -36, top: -20 }]} />
    </View>
  );
}

/**
 * Floating pill navigation (design system part 3): Deep Ocean pill with a white border, white outline
 * icons, and an Airy Blue capsule that slides to the active tab.
 */
export function BottomTabBar(props: MaterialTopTabBarProps & { navigation?: any }) {
  const { state, navigation, emitter, navigateToTab } = props as any;
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const reduceMotion = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);

  const routes: any[] = state.routes;
  const activeRouteName = useMemo(() => {
    const fromSegments = activeRouteFromSegments(segments as string[]);
    if (fromSegments) return fromSegments;
    return routes[state.index]?.name ?? 'index';
  }, [segments, state.index, routes]);
  const activeIndex = Math.max(0, routes.findIndex((r) => r.name === activeRouteName));

  debugListKeys('BottomTabBar', 'routes', routes, (route: any) => route.key);

  const slot = routes.length > 0 ? rowWidth / routes.length : 0;
  const capsuleWidth = Math.min(CAPSULE_MAX_WIDTH, Math.max(0, slot - spacing.sm));
  const targetX = slot * activeIndex + (slot - capsuleWidth) / 2;

  const x = useSharedValue(0);
  const placed = useSharedValue(false);
  useEffect(() => {
    if (slot === 0) return;
    // The first placement (and every move under reduced motion) snaps instead of sliding in from the edge.
    if (!placed.value || reduceMotion) {
      x.value = targetX;
      placed.value = true;
    } else {
      x.value = withTiming(targetX, { duration: INDICATOR_MS, easing: Easing.out(Easing.cubic) });
    }
  }, [targetX, slot, reduceMotion, x, placed]);

  const capsuleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: barBottomOffset(insets.bottom), paddingHorizontal: spacing.screenMargin }]}
    >
      <View
        accessibilityRole="tablist"
        style={[styles.bar, { backgroundColor: theme.tabBar, borderColor: theme.tabBarBorder }]}
      >
        <BackgroundPattern color={theme.tabInactive} />
        <View style={styles.row} onLayout={onRowLayout}>
          {slot > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.capsule,
                { width: capsuleWidth, backgroundColor: theme.tabActiveBackground },
                capsuleStyle,
              ]}
            />
          ) : null}
          {routes.map((route: any, index: number) => {
            const tab = TABS[route.name] ?? { icon: 'circle-outline' as IconName, label: route.name };
            const isFocused = index === activeIndex;

            const onPress = () => {
              const event = (emitter ?? navigation)?.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event?.defaultPrevented) {
                if (navigateToTab) {
                  navigateToTab(route.key);
                } else {
                  navigation?.navigate(route.name);
                }
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.item}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tab.label}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.iconWrap,
                      { width: capsuleWidth || CAPSULE_MAX_WIDTH },
                      // Pressing an inactive tab previews its capsule in Matcha Green.
                      pressed && !isFocused && { backgroundColor: theme.tabPressed, opacity: 0.35 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={tab.icon}
                      size={isFocused ? 26 : 24}
                      color={isFocused ? theme.tabActive : theme.tabInactive}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Absolutely positioned so the bar floats over the tab pager instead of taking a row beneath it.
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: BAR_MAX_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: AppRadius.full,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 8 },
      default: {
        shadowColor: '#000000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  capsule: {
    position: 'absolute',
    left: 0,
    height: CAPSULE_HEIGHT,
    borderRadius: AppRadius.full,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    height: CAPSULE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.full,
  },
  patternDot: {
    position: 'absolute',
    borderRadius: AppRadius.full,
    opacity: 0.05,
  },
});
