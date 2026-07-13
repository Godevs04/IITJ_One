import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { PrimaryButton } from '@/components/Buttons';
import { ScreenShell } from '@/components/ScreenShell';
import { getNote, saveNote } from '@/services/localDb';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

function uuid(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function NoteEditScreen() {
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
    router.back();
  }, [id, title, body]);

  return (
    <ScreenShell title={id ? 'Edit note' : 'New note'} subtitle="Private — never synced">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={AppColors.mutedText}
        style={styles.input}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write your note..."
        placeholderTextColor={AppColors.mutedText}
        style={styles.body}
        multiline
        textAlignVertical="top"
      />
      <PrimaryButton label="Save" onPress={() => void save()} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    padding: AppSpacing.md,
    ...AppTypography.h2,
  },
  body: {
    minHeight: 200,
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
});
