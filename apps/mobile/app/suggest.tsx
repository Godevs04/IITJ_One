import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '@/components/Buttons';
import { ErrorState } from '@/components/ErrorState';
import { ScreenShell } from '@/components/ScreenShell';
import { submitSuggestion } from '@/services/api';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

export default function SuggestScreen() {
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
    <ScreenShell title="Suggest Something" subtitle="Anonymous feedback for admins">
      <Text style={styles.intro}>
        Got an idea to improve campus life? Drop it here — no login needed.
      </Text>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="e.g. Add my hostel's laundry slot booking..."
        placeholderTextColor={AppColors.mutedText}
        style={styles.input}
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
    color: AppColors.inkSlate,
  },
  input: {
    minHeight: 200,
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
});
