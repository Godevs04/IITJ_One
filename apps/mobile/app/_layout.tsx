import { router, Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '@/config/posthog';
import { Ionicons } from '@expo/vector-icons';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import * as SplashScreen from 'expo-splash-screen';
import { initCache } from '@/services/cache';
import { ensureNotificationChannelsAsync } from '@/services/notificationChannels';
import { initBackendAnalytics, teardownBackendAnalytics } from '@/services/analytics/backendAnalytics';
import '@/services/search/registerBuiltInProviders';
import { CampusDataProvider } from '@/state/CampusDataProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { setRuntimeDebugContext } from '@/debug/listDebug';
import {
  initFirebase,
  useScreenTracking,
  setDefaultUserProperties,
  fetchRemoteConfig,
  initFCM,
  teardownFCM,
  registerBackgroundHandler,
  pathnameToScreenName,
} from '@/services/firebase';

// Register background notification handler at module level (required by Firebase)
registerBackgroundHandler();

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  useEffect(() => {
    async function bootstrap() {
      await initCache();
      initBackendAnalytics();
      await initFirebase();
      setDefaultUserProperties();
      void fetchRemoteConfig();
      void initFCM();
    }
    void bootstrap().finally(() => setReady(true));
    void ensureNotificationChannelsAsync();
    return () => { teardownFCM(); teardownBackendAnalytics(); };
  }, []);

  useEffect(() => {
    if (ready && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <CampusDataProvider>
            <PostHogProvider
              client={posthog}
              autocapture={{
                captureScreens: false,
                captureTouches: true,
                propsToCapture: ['testID'],
                maxElementsCaptured: 20,
              }}
            >
              <RootNavigator />
            </PostHogProvider>
          </CampusDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function RootNavigator() {
  const { scheme, colors } = useTheme();
  const isDark = scheme === 'dark';
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  if (__DEV__) {
    setRuntimeDebugContext({
      route: pathname,
      screen: pathnameToScreenName(pathname),
    });
  }

  // Manual PostHog screen tracking for Expo Router
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, { previous_screen: previousPathname.current ?? null, ...params });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  // Auto-track every screen transition
  useScreenTracking();

  useEffect(() => {
    if (!__DEV__) return;

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      const message =
        typeof firstArg === 'string'
          ? firstArg
          : firstArg instanceof Error
            ? firstArg.message
            : '';

      if (message.includes('Each child in a list should have a unique "key" prop')) {
        const context = globalThis.__IITJ_ONE_RUNTIME_DEBUG_CONTEXT__;
        console.group('🔑 React Key Warning');
        console.log('Current pathname:', pathname);
        console.log('Current screen:', pathnameToScreenName(pathname));
        console.log('Context route/screen:', context);
        console.trace('JavaScript stack');
        originalError.apply(console, args as never);
        console.groupEnd();
      } else {
        originalError.apply(console, args as never);
      }
    };

    return () => {
      console.error = originalError;
    };
  }, [pathname]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.headerTint,
          headerTitleStyle: { fontWeight: '600', fontFamily: 'IBMPlexSans_600SemiBold' },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.background },
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/search')}
              hitSlop={10}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Search"
            >
              <Ionicons name="search-outline" size={22} color={colors.headerTint} />
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="map" options={{ title: 'Campus Directory' }} />
        <Stack.Screen name="portals" options={{ title: 'Essential Portals' }} />
        <Stack.Screen name="apps" options={{ title: 'Campus Apps' }} />
        <Stack.Screen name="calendar" options={{ title: 'Academic Calendar' }} />
        <Stack.Screen name="services" options={{ title: 'Campus Services' }} />
        <Stack.Screen name="laundry" options={{ title: 'Laundry' }} />
        <Stack.Screen name="e-rickshaw" options={{ title: 'E-Rickshaw' }} />
        <Stack.Screen name="cabs-autos" options={{ title: 'Cabs & Autos' }} />
        <Stack.Screen name="wifi" options={{ title: 'Internet & Wi-Fi' }} />
        <Stack.Screen name="emergency" options={{ title: 'Emergency Contacts' }} />
        <Stack.Screen name="about" options={{ title: 'About IITJ One' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="mess-qr" options={{ title: 'My Mess QR' }} />
        <Stack.Screen name="timetable" options={{ headerShown: false }} />
        <Stack.Screen name="notes" options={{ title: 'Notes' }} />
        <Stack.Screen name="notes/edit" options={{ title: 'Edit Note' }} />
        <Stack.Screen name="suggest" options={{ title: 'Suggest Something' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
