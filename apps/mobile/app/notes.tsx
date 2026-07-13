import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, View } from 'react-native';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/Buttons';
import { ScreenShell } from '@/components/ScreenShell';
import { deleteNote, listNotes, type Note } from '@/services/localDb';
import { AppSpacing } from '@/theme/tokens';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    setNotes(await listNotes());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openNote = (note?: Note) => {
    router.push({
      pathname: '/notes/edit',
      params: note ? { id: note.id } : {},
    });
  };

  const removeNote = (note: Note) => {
    Alert.alert('Delete note?', note.title || 'Untitled', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          await load();
        },
      },
    ]);
  };

  return (
    <ScreenShell hideTitle subtitle="Stored only on this device">
      <PrimaryButton label="New note" onPress={() => openNote()} />

      {notes.length > 0 ? (
        <View style={{ gap: AppSpacing.md }}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={() => openNote(note)}
              onLongPress={() => removeNote(note)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="create-outline"
          title="No notes yet"
          message="Tap New note to capture something quickly."
        />
      )}
    </ScreenShell>
  );
}
