import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { goBack } from '@/navigation/goBack';
import {
  MEMO_MAX_LENGTH,
  buildReminder,
  formatClock,
  formatLongDate,
  parseDateKey,
  validateDraft,
  type ReminderDraft,
} from '@/reminders/reminderLogic';
import { reminderStore } from '@/reminders/reminderStore';
import { DatePickerSheet, TimePickerSheet } from '@/reminders/ui/Pickers';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

type IconName = keyof typeof MaterialIcons.glyphMap;
type PickerKind = 'date' | 'start' | 'end' | null;

/** One tappable row of the Date & Time section. */
function PickerField({
  icon,
  label,
  value,
  placeholder,
  error,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string | null;
  placeholder: string;
  error?: string;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.fieldBlock}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: theme.inputBackground, borderColor: error ? theme.error : theme.border },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons name={icon} size={20} color={theme.textMuted} />
        <View style={styles.fieldText}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
          <Text style={[styles.fieldValue, { color: value ? theme.text : theme.textMuted }]}>{value ?? placeholder}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.iconMuted} />
      </Pressable>
      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
    </View>
  );
}

/** Screen 03 — memo, date and time, SAVE. */
export default function NewReminderScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // A class (or, later, an event) opens this form pre-filled; the user can change anything before saving.
  const params = useLocalSearchParams<{ memo?: string; date?: string; start?: string; end?: string; sourceType?: string; sourceId?: string }>();
  const minutesParam = (v?: string) => (v != null && /^\d+$/.test(v) && Number(v) < 24 * 60 ? Number(v) : null);
  const [draft, setDraft] = useState<ReminderDraft>(() => ({
    memo: typeof params.memo === 'string' ? params.memo.slice(0, MEMO_MAX_LENGTH) : '',
    date: parseDateKey(params.date),
    startMinutes: minutesParam(params.start),
    endMinutes: minutesParam(params.end),
    ...((params.sourceType === 'timetable' || params.sourceType === 'event') && params.sourceId
      ? { source: { type: params.sourceType, id: params.sourceId } }
      : {}),
  }));
  const [picker, setPicker] = useState<PickerKind>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set once the reminder is stored (or the user chose to discard), so leaving is not questioned again.
  const leaving = useRef(false);

  const errors = useMemo(() => validateDraft(draft, new Date()), [draft]);
  const isValid = Object.keys(errors).length === 0;
  const isDirty = draft.memo.trim() !== '' || draft.date != null || draft.startMinutes != null;

  // Ask before throwing away a part-filled form. (Alert has no web implementation, so web just leaves.)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // expo-router's useNavigation() is typed without the stack's own events, so the event is described here.
    type BeforeRemove = { preventDefault: () => void; data: { action: Parameters<typeof navigation.dispatch>[0] } };
    const stack = navigation as unknown as {
      addListener: (type: 'beforeRemove', listener: (e: BeforeRemove) => void) => () => void;
    };
    return stack.addListener('beforeRemove', (e) => {
      if (!isDirty || leaving.current) return;
      e.preventDefault();
      Alert.alert('Discard this reminder?', 'It has not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            leaving.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
  }, [navigation, isDirty]);

  const save = async () => {
    if (saving) return;
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const now = new Date();
      await reminderStore.add(buildReminder(draft, now, Crypto.randomUUID()));
      leaving.current = true;
      goBack();
    } catch {
      setSaveError('Could not save the reminder. Try again.');
      setSaving(false);
    }
  };

  const today = new Date();
  const nextHalfHour = Math.min(23 * 60 + 30, Math.ceil((today.getHours() * 60 + today.getMinutes() + 1) / 30) * 30);
  const visibleErrors = showErrors ? errors : {};

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Memo</Text>
          <TextInput
            value={draft.memo}
            onChangeText={(memo) => setDraft((d) => ({ ...d, memo }))}
            placeholder="What do you need to remember?"
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={MEMO_MAX_LENGTH}
            textAlignVertical="top"
            accessibilityLabel="Memo"
            style={[
              styles.memo,
              {
                color: theme.text,
                backgroundColor: theme.inputBackground,
                borderColor: visibleErrors.memo ? theme.error : theme.border,
              },
            ]}
          />
          {visibleErrors.memo ? <Text style={[styles.error, { color: theme.error }]}>{visibleErrors.memo}</Text> : null}
        </View>

        <View style={[styles.rule, { backgroundColor: theme.border }]} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Date &amp; Time</Text>
          <PickerField
            icon="event"
            label="Date"
            value={draft.date ? formatLongDate(draft.date) : null}
            placeholder="Choose a date"
            error={visibleErrors.date}
            onPress={() => setPicker('date')}
          />
          <PickerField
            icon="schedule"
            label="Start time"
            value={draft.startMinutes != null ? formatClock(draft.startMinutes) : null}
            placeholder="Choose a time"
            error={visibleErrors.start}
            onPress={() => setPicker('start')}
          />
          <PickerField
            icon="schedule"
            label="End time (optional)"
            value={draft.endMinutes != null ? formatClock(draft.endMinutes) : null}
            placeholder="No end time"
            error={visibleErrors.end}
            onPress={() => setPicker('end')}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {saveError ? (
          <Text style={[styles.error, styles.saveError, { color: theme.error }]} accessibilityLiveRegion="polite">
            {saveError}
          </Text>
        ) : null}
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving reminder' : 'Save reminder'}
          accessibilityState={{ disabled: saving || !isValid, busy: saving }}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.primary, opacity: isValid || saving ? 1 : 0.5 },
            pressed && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <Text style={[styles.saveText, { color: theme.onPrimary }]}>{saveError ? 'TRY AGAIN' : 'SAVE'}</Text>
          )}
        </Pressable>
      </View>

      <DatePickerSheet
        visible={picker === 'date'}
        value={draft.date}
        minDate={today}
        onClose={() => setPicker(null)}
        onChange={(date) => setDraft((d) => ({ ...d, date }))}
      />
      <TimePickerSheet
        visible={picker === 'start'}
        title="Start time"
        value={draft.startMinutes}
        fallback={nextHalfHour}
        onClose={() => setPicker(null)}
        onChange={(startMinutes) => setDraft((d) => ({ ...d, startMinutes }))}
      />
      <TimePickerSheet
        visible={picker === 'end'}
        title="End time"
        value={draft.endMinutes}
        fallback={Math.min(23 * 60 + 55, (draft.startMinutes ?? nextHalfHour) + 60)}
        onClose={() => setPicker(null)}
        onChange={(endMinutes) => setDraft((d) => ({ ...d, endMinutes }))}
        onClear={() => setDraft((d) => ({ ...d, endMinutes: null }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.screenMargin,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...AppTypography.h2,
  },
  memo: {
    ...AppTypography.body,
    minHeight: 144,
    borderWidth: 1,
    borderRadius: AppRadius.lg,
    padding: spacing.md,
  },
  rule: {
    height: 1,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  field: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: AppRadius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fieldText: {
    flex: 1,
  },
  fieldLabel: {
    ...AppTypography.bodySmall,
  },
  fieldValue: {
    ...AppTypography.body,
  },
  error: {
    ...AppTypography.bodySmall,
  },
  saveError: {
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.screenMargin,
    paddingTop: spacing.sm,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...AppTypography.button,
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
