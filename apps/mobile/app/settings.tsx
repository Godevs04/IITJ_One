import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import {
  loadTopicPrefs,
  registerForPushNotifications,
  saveTopicPrefs,
  type PushRegistration,
} from '@/services/pushTopics';
import { FeedbackPromptManager } from '@/services/feedbackPrompt';
import { useTheme } from '@/theme/ThemeProvider';
import { Analytics, AppEvents } from '@/services/firebase';
import { AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';
import { usePostHog } from 'posthog-react-native';


const NOTIFICATION_TOPICS = [
  { key: 'iitj_all', label: 'All campus updates', description: 'General announcements for everyone on campus' },
  { key: 'iitj_mess', label: 'Mess menu', description: 'New monthly menus and mess changes' },
  { key: 'iitj_transport', label: 'Transport', description: 'Bus timing changes, cancellations and breakdowns' },
  { key: 'iitj_institute', label: 'Institute notices', description: 'Official notices from the institute' },
  {
    key: 'iitj_orientation',
    label: 'Freshers’ orientation',
    description: 'Orientation schedule and announcements for new students — safe to turn off after your first weeks',
  },
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
            pushInfo?.status === 'granted'
              ? 'Active — receiving updates for selected topics'
              : pushInfo?.status === 'denied'
              ? 'Disabled in system settings'
              : 'Preferences saved'
          }
        />
        {pushInfo?.note ? (
          <Text style={{ ...AppTypography.caption, color: colors.textMuted, paddingHorizontal: 4 }}>
            {pushInfo.note}
          </Text>
        ) : null}
        {NOTIFICATION_TOPICS.map((topic) => {
          const enabled = topicPrefs[topic.key] !== false;
          const setEnabled = (value: boolean) => {
            const next = { ...topicPrefs, [topic.key]: value };
            setTopicPrefs(next);
            saveTopicPrefs(next);
            posthog.capture('notification_topic_toggled', { topic: topic.key, enabled: value });
          };
          return (
            <DirectoryRow
              key={topic.key}
              title={topic.label}
              subtitle={topic.description}
              renderRight={() => (
                <Switch
                  value={enabled}
                  onValueChange={setEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={colors.border}
                  accessibilityLabel={`${topic.label} notifications`}
                />
              )}
            />
          );
        })}
      </View>

      <View style={{ gap: AppSpacing.sm }}>
        <DirectoryRow
          title="Customize Home"
          subtitle="Reorder or hide Home screen sections"
          onPress={() => router.push('/customize-home' as never)}
        />
        <DirectoryRow title="Feedback & Suggestions" onPress={() => router.push('/suggest')} />
        <DirectoryRow
          title="About & support"
          subtitle="Help, contact us, privacy policy and terms"
          onPress={() => router.push('/about')}
        />
      </View>

      {__DEV__ ? (
        <View style={{ gap: AppSpacing.sm }}>
          <Text style={{ ...AppTypography.caption, color: colors.textMuted, paddingHorizontal: 4 }}>
            Developer Tools
          </Text>
          <DirectoryRow
            title="Reset feedback prompt"
            subtitle="Clears usage timer + shown flag so it can be re-tested"
            onPress={() => {
              FeedbackPromptManager.reset();
              Alert.alert('Reset', 'Feedback prompt state cleared. It will show again after 10 minutes of active usage.');
            }}
          />
        </View>
      ) : null}
    </ScreenShell>
  );
}
