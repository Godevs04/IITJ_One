import { TopTabs, type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { BottomTabBar } from '@/components/BottomTabBar';
import { SwipeProvider, useSwipeGesture } from '@/navigation/SwipeContext';

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
    <TopTabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled,
        animationEnabled: true,
        lazy: true,
        lazyPlaceholder: () => null,
      }}
      tabBar={(props: MaterialTopTabBarProps) => <BottomTabBar {...props} />}
    >
      <TopTabs.Screen name="index" options={{ title: 'Home' }} />
      <TopTabs.Screen name="map" options={{ title: 'Campus Map' }} />
      <TopTabs.Screen name="search" options={{ title: 'Search' }} />
      <TopTabs.Screen name="phc" options={{ title: 'Primary Health Centre' }} />
      <TopTabs.Screen name="transport" options={{ title: 'Transportation' }} />
    </TopTabs>
  );
}
