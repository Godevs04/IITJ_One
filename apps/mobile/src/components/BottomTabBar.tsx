import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing } from '@/theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

/** Icon per route name — keep in sync with the `(tabs)` screen files. */
const TAB_ICONS: Record<string, IconName> = {
  index: 'home-outline',
  menu: 'restaurant-outline',
  notices: 'megaphone-outline',
  transport: 'bus-outline',
  more: 'grid-outline',
};

export function BottomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

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
        const isFocused = state.index === index;
        const color = isFocused ? theme.tabActive : theme.tabInactive;
        const icon = TAB_ICONS[route.name] ?? 'ellipse-outline';

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
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
          >
            <Ionicons name={icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
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
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
