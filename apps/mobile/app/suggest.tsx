import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_CATEGORY_PLACEHOLDERS,
  type SuggestionCategory,
} from '@iitj1/types';
import { PrimaryButton } from '@/components/Buttons';
import { ErrorState } from '@/components/ErrorState';
import { ScreenShell } from '@/components/ScreenShell';
import { submitSuggestion } from '@/services/api';
import { getOrCreateDeviceId } from '@/services/firebase/deviceId';
import { Analytics, AppEvents } from '@/services/firebase';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { usePostHog } from 'posthog-react-native';

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 1000;
const NAME_MAX = 100;

// Simple format check — the backend is the source of truth for validity, this is just fast feedback.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function platformName(): string {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
}

export default function SuggestScreen() {
  const theme = useThemeColors();
  const posthog = usePostHog();
  const [category, setCategory] = useState<SuggestionCategory | null>(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedMessage = message.trim();
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();

  const messageValid = trimmedMessage.length >= MESSAGE_MIN && trimmedMessage.length <= MESSAGE_MAX;
  const emailValid = trimmedEmail.length === 0 || EMAIL_PATTERN.test(trimmedEmail);
  const nameValid = trimmedName.length <= NAME_MAX;

  const canSend = !!category && messageValid && emailValid && nameValid && !sending;

  const contactSummary = useMemo(() => {
    if (!trimmedName && !trimmedEmail) return 'Submission is anonymous.';
    return 'Leave blank to submit anonymously.';
  }, [trimmedName, trimmedEmail]);

  const clearForm = useCallback(() => {
    setCategory(null);
    setMessage('');
    setName('');
    setEmail('');
  }, []);

  const send = useCallback(async () => {
    if (sending) return;

    if (!category) {
      Alert.alert('Missing Category', 'Please select a category for your feedback.');
      return;
    }
    if (!messageValid) {
      Alert.alert('Invalid Message', `Your message must be at least ${MESSAGE_MIN} characters long.`);
      return;
    }
    if (!emailValid) {
      Alert.alert('Invalid Email', 'Please enter a valid email address or leave it blank.');
      return;
    }
    if (!nameValid) {
      Alert.alert('Invalid Name', `Name is too long (max ${NAME_MAX} characters).`);
      return;
    }

    setSending(true);
    setError(null);
    try {
      await submitSuggestion({
        message: trimmedMessage,
        category,
        name: trimmedName || undefined,
        email: trimmedEmail || undefined,
        deviceId: getOrCreateDeviceId(),
        platform: platformName(),
        appVersion: appVersion(),
      });
      posthog.capture('suggestion_submitted', {
        category,
        message_length: trimmedMessage.length,
        has_name: !!trimmedName,
        has_email: !!trimmedEmail,
      });
      Analytics.trackEvent(AppEvents.FEEDBACK_SUBMITTED, { category });
      clearForm();
      Alert.alert(
        'Thanks for your feedback!',
        "We'll review it and use it to improve IITJ One.",
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not send';
      posthog.capture('suggestion_failed', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  }, [sending, category, messageValid, emailValid, nameValid, trimmedMessage, trimmedName, trimmedEmail, posthog, clearForm]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Share feedback, report issues, or suggest new features for IITJ One."
    >
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Category</Text>
        <View style={styles.chipRow}>
          {SUGGESTION_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <Text
                key={c}
                onPress={() => setCategory(c)}
                accessibilityRole="button"
                accessibilityLabel={SUGGESTION_CATEGORY_LABELS[c]}
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryTint : theme.chipBackground,
                    borderColor: active ? theme.primary : theme.border,
                    color: active ? theme.linkText : theme.chipText,
                  },
                ]}
              >
                {SUGGESTION_CATEGORY_LABELS[c]}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Your feedback</Text>
        <TextInput
          value={message}
          onChangeText={(v) => setMessage(v.slice(0, MESSAGE_MAX))}
          placeholder={category ? SUGGESTION_CATEGORY_PLACEHOLDERS[category] : 'Select a category above to get started...'}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          multiline
          textAlignVertical="top"
          maxLength={MESSAGE_MAX}
          accessibilityLabel="Feedback message"
          accessibilityHint={`Minimum ${MESSAGE_MIN} characters, maximum ${MESSAGE_MAX}`}
        />
        <Text
          style={[
            styles.counter,
            { color: message.length > MESSAGE_MAX - 50 ? theme.error : theme.textMuted },
          ]}
        >
          {message.length} / {MESSAGE_MAX}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Contact details (optional)</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (Optional)"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.contactInput,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          maxLength={NAME_MAX}
          accessibilityLabel="Name, optional"
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email (Optional)"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.contactInput,
            {
              backgroundColor: theme.inputBackground,
              borderColor: !emailValid ? theme.error : theme.border,
              color: theme.text,
            },
          ]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email, optional"
        />
        {!emailValid ? (
          <Text style={[styles.helperText, { color: theme.error }]}>Enter a valid email address, or leave it blank.</Text>
        ) : (
          <Text style={[styles.helperText, { color: theme.textMuted }]}>{contactSummary}</Text>
        )}
      </View>

      {error ? <ErrorState message={error} onRetry={() => void send()} /> : null}

      <PrimaryButton
        label={sending ? 'Sending...' : 'Send Feedback'}
        onPress={() => void send()}
        disabled={sending}
        accessibilityHint="Submits your feedback to the IITJ One team"
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: AppSpacing.xs,
  },
  sectionLabel: {
    ...AppTypography.sectionLabel,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  chip: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    overflow: 'hidden',
  },
  input: {
    minHeight: 160,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
  counter: {
    ...AppTypography.caption,
    textAlign: 'right',
  },
  contactInput: {
    minHeight: 48,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    ...AppTypography.body,
  },
  helperText: {
    ...AppTypography.caption,
  },
});
