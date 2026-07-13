import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import { getSetting, setSetting } from '@/services/cache';
import { useTheme } from '@/theme/ThemeProvider';
import { AppSpacing } from '@/theme/tokens';

const NOTIFICATION_TOPICS = [
  { key: 'iitj_all', label: 'All campus updates' },
  { key: 'iitj_mess', label: 'Mess menu' },
  { key: 'iitj_transport', label: 'Transport' },
  { key: 'iitj_institute', label: 'Institute notices' },
  { key: 'iitj_orientation', label: 'Orientation' },
] as const;

export default function SettingsScreen() {
  const { darkMode, setDarkMode, colors } = useTheme();
  const [topicPrefs, setTopicPrefs] = useState(getSetting<Record<string, boolean>>('topicPrefs', {}));

  const toggleDark = (value: boolean) => {
    setDarkMode(value);
  };

  return (
    <ScreenShell title="Settings" subtitle="Preferences and personal tools" hideTitle>
      <View style={{ gap: AppSpacing.sm }}>
        <DirectoryRow
          title="Dark mode"
          subtitle={darkMode ? 'On' : 'Off'}
          renderRight={() => (
            <Switch
              value={darkMode}
              onValueChange={toggleDark}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          )}
        />
      </View>

      <View style={{ gap: AppSpacing.sm }}>
        <DirectoryRow title="Notification preferences" subtitle="FCM topic toggles (local)" />
        {NOTIFICATION_TOPICS.map((topic) => (
          <DirectoryRow
            key={topic.key}
            title={topic.label}
            subtitle={topicPrefs[topic.key] !== false ? 'Subscribed' : 'Muted'}
            onPress={() => {
              const next = { ...topicPrefs, [topic.key]: topicPrefs[topic.key] === false };
              setTopicPrefs(next);
              setSetting('topicPrefs', next);
            }}
          />
        ))}
      </View>

      <View style={{ gap: AppSpacing.sm }}>
        <DirectoryRow
          title="My Mess QR"
          subtitle="Stored only on this device"
          onPress={() => router.push('/mess-qr')}
        />
        <DirectoryRow
          title="My Timetable"
          subtitle="Stored only on this device"
          onPress={() => router.push('/timetable')}
        />
        <DirectoryRow
          title="Notes"
          subtitle="Stored only on this device"
          onPress={() => router.push('/notes')}
        />
        <DirectoryRow title="Suggest Something" onPress={() => router.push('/suggest')} />
        <DirectoryRow title="About IITJ" onPress={() => router.push('/about')} />
      </View>
    </ScreenShell>
  );
}
