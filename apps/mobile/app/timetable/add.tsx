import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { ScreenShell } from '@/components/ScreenShell';
import {
  deleteTimetableEntry,
  getTimetableEntry,
  saveTimetableEntry,
  type ClassType,
  type TimetableEntry,
} from '@/services/localDb';
import {
  cancelClassNotifications,
  rescheduleClassNotifications,
} from '@/services/notifications';
import { useThemeColors } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/tokens';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const CLASS_TYPES: ClassType[] = ['lecture', 'lab', 'tutorial'];

function uuid(): string {
  return `cls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AddClassScreen() {
  const theme = useThemeColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [className, setClassName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classType, setClassType] = useState<ClassType>('lecture');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(['mon']);
  const [room, setRoom] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showOnHome, setShowOnHome] = useState(false);

  useEffect(() => {
    if (!id) return;
    void getTimetableEntry(String(id)).then((entry) => {
      if (!entry) return;
      setClassName(entry.className);
      setStartTime(entry.startTime);
      setEndTime(entry.endTime);
      setClassType(entry.classType);
      setDaysOfWeek(entry.daysOfWeek);
      setRoom(entry.room ?? '');
      setReminderEnabled(entry.reminderEnabled);
      setShowOnHome(entry.showOnHome);
    });
  }, [id]);

  const toggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const save = useCallback(async () => {
    if (!className.trim() || daysOfWeek.length === 0) {
      Alert.alert('Missing fields', 'Class name and at least one day are required.');
      return;
    }

    const entry: TimetableEntry = {
      id: id ? String(id) : uuid(),
      className: className.trim(),
      startTime,
      endTime,
      classType,
      daysOfWeek,
      room: room.trim() || null,
      reminderEnabled,
      showOnHome,
      reminderMinutesBefore: 10,
      createdAt: new Date().toISOString(),
    };

    if (id) {
      const old = await getTimetableEntry(String(id));
      if (old) await cancelClassNotifications(old.id, old.daysOfWeek);
    }

    await saveTimetableEntry(entry);
    if (reminderEnabled) await rescheduleClassNotifications(entry);
    router.back();
  }, [className, startTime, endTime, classType, daysOfWeek, room, reminderEnabled, showOnHome, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    const old = await getTimetableEntry(String(id));
    if (old) await cancelClassNotifications(old.id, old.daysOfWeek);
    await deleteTimetableEntry(String(id));
    router.back();
  }, [id]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.inputBackground,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

  return (
    <ScreenShell hideTitle subtitle="Personal timetable">
      <Field label="Class name" theme={theme}>
        <TextInput
          value={className}
          onChangeText={setClassName}
          placeholder="e.g. Operating Systems"
          placeholderTextColor={theme.textMuted}
          style={inputStyle}
        />
      </Field>

      <View style={styles.row}>
        <Field label="Start" theme={theme}>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            style={[...inputStyle, styles.inputMono]}
          />
        </Field>
        <Field label="End" theme={theme}>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            style={[...inputStyle, styles.inputMono]}
          />
        </Field>
      </View>

      <Field label="Class type" theme={theme}>
        <View style={styles.segmentRow}>
          {CLASS_TYPES.map((type) => {
            const active = classType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setClassType(type)}
                style={[
                  styles.segment,
                  {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? theme.primary : theme.chipBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? theme.onPrimary : theme.text },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Repeats on" theme={theme}>
        <View style={styles.dayRow}>
          {DAYS.map((d) => {
            const active = daysOfWeek.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDay(d)}
                style={[
                  styles.dayBox,
                  {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? theme.primary : theme.chipBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayBoxText,
                    { color: active ? theme.onPrimary : theme.chipText },
                  ]}
                >
                  {d[0].toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Room (optional)" theme={theme}>
        <TextInput
          value={room}
          onChangeText={setRoom}
          placeholderTextColor={theme.textMuted}
          style={inputStyle}
        />
      </Field>

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>
          Remind me 10 minutes before
        </Text>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={reminderEnabled ? '#ffffff' : '#f4f3f4'}
          ios_backgroundColor={theme.border}
        />
      </View>

      <View style={[styles.toggleRow, styles.toggleRowBordered, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            Show on Home Screen
          </Text>
          <Text style={[styles.toggleSub, { color: theme.textMuted }]}>
            Display this class in the Next Class widget
          </Text>
        </View>
        <Switch
          value={showOnHome}
          onValueChange={setShowOnHome}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={showOnHome ? '#ffffff' : '#f4f3f4'}
          ios_backgroundColor={theme.border}
        />
      </View>

      <PrimaryButton label="Save" onPress={() => void save()} />
      {isEdit ? (
        <SecondaryButton label="Delete class" onPress={() => void remove()} />
      ) : null}
    </ScreenShell>
  );
}

function Field({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: AppSpacing.xs },
  label: {
    ...AppTypography.caption,
  },
  input: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
  inputMono: {
    ...AppTypography.dataMono,
    fontFamily: 'monospace',
  },
  row: { flexDirection: 'row', gap: AppSpacing.md },
  segmentRow: { flexDirection: 'row', gap: AppSpacing.sm },
  segment: {
    flex: 1,
    padding: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: {
    ...AppTypography.bodySmall,
    textTransform: 'capitalize',
  },
  dayRow: { flexDirection: 'row', gap: AppSpacing.xs },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxText: { ...AppTypography.caption },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { ...AppTypography.body, flex: 1 },
  toggleRowBordered: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
  },
  toggleSub: { ...AppTypography.caption },
});
