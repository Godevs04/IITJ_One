import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import { PrimaryButton } from '@/components/Buttons';
import { ErrorState } from '@/components/ErrorState';
import { ScreenShell } from '@/components/ScreenShell';
import { submitSuggestion } from '@/services/api';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

export default function SuggestScreen() {
  const theme = useThemeColors();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !sending;

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await submitSuggestion(trimmed);
      setMessage('');
      Alert.alert('Thanks — we got it', 'Your suggestion was sent anonymously.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }, [canSend, trimmed]);

  return (
    <ScreenShell hideTitle subtitle="Anonymous feedback for admins">
      <Text style={[styles.intro, { color: theme.text }]}>
        Got an idea to improve campus life? Drop it here — no login needed.
      </Text>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="e.g. Add my hostel's laundry slot booking..."
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
      />

      {error ? (
        <ErrorState message={error} onRetry={() => void send()} />
      ) : null}

      <PrimaryButton
        label={sending ? 'Sending...' : 'Send'}
        onPress={() => void send()}
        disabled={!canSend}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...AppTypography.body,
  },
  input: {
    minHeight: 200,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
});
