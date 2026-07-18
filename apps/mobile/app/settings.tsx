import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import {
  loadTopicPrefs,
  registerForPushNotifications,
  saveTopicPrefs,
  type PushRegistration,
} from '@/services/pushTopics';
import { useTheme } from '@/theme/ThemeProvider';
import { Analytics, AppEvents } from '@/services/firebase';
import { AppSpacing, AppTypography } from '@/theme/tokens';
import { isHttpUrl } from '@/utils/urlSafety';
import { debugListKeys } from '@/debug/listDebug';
import { usePostHog } from 'posthog-react-native';

const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL;

const NOTIFICATION_TOPICS = [
  { key: 'iitj_all', label: 'All campus updates' },
  { key: 'iitj_mess', label: 'Mess menu' },
  { key: 'iitj_transport', label: 'Transport' },
  { key: 'iitj_institute', label: 'Institute notices' },
  { key: 'iitj_orientation', label: 'Orientation' },
] as const;

export default function SettingsScreen() {
  const posthog = usePostHog();
  const { darkMode, setDarkMode, colors } = useTheme();
  const [topicPrefs, setTopicPrefs] = useState(loadTopicPrefs());
  const [pushInfo, setPushInfo] = useState<PushRegistration | null>(null);
  debugListKeys('SettingsScreen', 'notificationTopics', NOTIFICATION_TOPICS, (topic) => topic.key);

  useEffect(() => {
    void registerForPushNotifications().then(setPushInfo);
  }, []);

  const toggleDark = (value: boolean) => {
    setDarkMode(value);
    Analytics.trackEvent(AppEvents.THEME_CHANGED, { theme: value ? 'dark' : 'light' });
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
              thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor={colors.border}
              accessibilityLabel="Dark mode"
            />
          )}
        />
      </View>

      <View style={{ gap: AppSpacing.sm }}>
        <DirectoryRow
          title="Notification preferences"
          subtitle={
            pushInfo?.expoPushToken
              ? 'Device token registered'
              : 'Local prefs · remote FCM topics need a release build'
          }
        />
        {pushInfo?.note ? (
          <Text style={{ ...AppTypography.caption, color: colors.textMuted, paddingHorizontal: 4 }}>
            {pushInfo.note}
          </Text>
        ) : null}
        {NOTIFICATION_TOPICS.map((topic) => (
          <DirectoryRow
            key={topic.key}
            title={topic.label}
            subtitle={topicPrefs[topic.key] !== false ? 'Enabled locally' : 'Muted locally'}
            onPress={() => {
              const next = { ...topicPrefs, [topic.key]: topicPrefs[topic.key] === false };
              setTopicPrefs(next);
              saveTopicPrefs(next);
              posthog.capture('notification_topic_toggled', {
                topic: topic.key,
                enabled: next[topic.key] !== false,
              });
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
        <DirectoryRow title="About IITJ One" onPress={() => router.push('/about')} />
        {isHttpUrl(PRIVACY_POLICY_URL) ? (
          <DirectoryRow
            title="Privacy Policy"
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          />
        ) : null}
        {isHttpUrl(TERMS_URL) ? (
          <DirectoryRow
            title="Terms of Use"
            onPress={() => void Linking.openURL(TERMS_URL)}
          />
        ) : null}
      </View>
    </ScreenShell>
  );
}
