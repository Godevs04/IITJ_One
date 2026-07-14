import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import * as SplashScreen from 'expo-splash-screen';
import { initCache } from '@/services/cache';
import { CampusDataProvider } from '@/state/CampusDataProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

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
    void initCache().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <ThemeProvider>
      <CampusDataProvider>
        <RootNavigator />
      </CampusDataProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { scheme, colors } = useTheme();
  const isDark = scheme === 'dark';

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
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        <Stack.Screen name="about" options={{ title: 'About IITJ' }} />
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
