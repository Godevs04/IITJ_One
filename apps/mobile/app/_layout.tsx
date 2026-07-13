import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initCache } from '@/services/cache';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void initCache().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <RootNavigator />
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
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="map" options={{ title: 'Campus Map' }} />
        <Stack.Screen name="portals" options={{ title: 'Essential Portals' }} />
        <Stack.Screen name="services" options={{ title: 'Campus Services' }} />
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
