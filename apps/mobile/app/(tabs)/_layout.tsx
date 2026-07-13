import { withLayoutContext } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { BottomTabBar } from '@/components/BottomTabBar';
import { SwipeProvider, useSwipeGesture } from '@/navigation/SwipeContext';

// This is the only way to access the underlying navigator (see expo-router's
// own `Tabs` implementation, which does the same for @react-navigation/bottom-tabs).
const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabLayout() {
  return (
    <SwipeProvider>
      <SwipeableTabs />
    </SwipeProvider>
  );
}

function SwipeableTabs() {
  const { swipeEnabled } = useSwipeGesture();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled,
        animationEnabled: true,
        lazy: true,
        lazyPlaceholder: () => null,
      }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: 'Home' }} />
      <MaterialTopTabs.Screen name="menu" options={{ title: 'Menu' }} />
      <MaterialTopTabs.Screen name="notices" options={{ title: 'Notices' }} />
      <MaterialTopTabs.Screen name="transport" options={{ title: 'Transport' }} />
      <MaterialTopTabs.Screen name="more" options={{ title: 'More' }} />
    </MaterialTopTabs>
  );
}
