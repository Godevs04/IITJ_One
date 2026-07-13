import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function TimetableLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBackground },
        headerTintColor: colors.headerTint,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Timetable' }} />
      <Stack.Screen name="add" options={{ title: 'Add Class' }} />
    </Stack>
  );
}
