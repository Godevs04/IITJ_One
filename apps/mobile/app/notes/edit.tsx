import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, TextInput } from 'react-native';
import { PrimaryButton } from '@/components/Buttons';
import { ScreenShell } from '@/components/ScreenShell';
import { getNote, saveNote } from '@/services/localDb';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { usePostHog } from 'posthog-react-native';

function uuid(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function NoteEditScreen() {
  const theme = useThemeColors();
  const posthog = usePostHog();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!id) return;
    void getNote(String(id)).then((note) => {
      if (!note) return;
      setTitle(note.title);
      setBody(note.body);
    });
  }, [id]);

  const save = useCallback(async () => {
    const now = new Date().toISOString();
    const existing = id ? await getNote(String(id)) : null;
    await saveNote({
      id: id ? String(id) : uuid(),
      title: title.trim(),
      body: body.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    posthog.capture('note_saved', {
      is_new: !id,
      has_title: title.trim().length > 0,
      body_length: body.trim().length,
    });
    router.back();
  }, [id, title, body, posthog]);

  const fieldStyle = {
    backgroundColor: theme.inputBackground,
    borderColor: theme.border,
    color: theme.text,
  };

  return (
    <ScreenShell hideTitle subtitle="Private — never synced">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, fieldStyle]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write your note..."
        placeholderTextColor={theme.textMuted}
        style={[styles.body, fieldStyle]}
        multiline
        textAlignVertical="top"
      />
      <PrimaryButton label="Save" onPress={() => void save()} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    ...AppTypography.h2,
  },
  body: {
    minHeight: 200,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
});
