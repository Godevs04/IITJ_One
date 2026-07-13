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
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const CLASS_TYPES: ClassType[] = ['lecture', 'lab', 'tutorial'];

function uuid(): string {
  return `cls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AddClassScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [className, setClassName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classType, setClassType] = useState<ClassType>('lecture');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(['mon']);
  const [room, setRoom] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);

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
  }, [className, startTime, endTime, classType, daysOfWeek, room, reminderEnabled, id]);

  const remove = useCallback(async () => {
    if (!id) return;
    const old = await getTimetableEntry(String(id));
    if (old) await cancelClassNotifications(old.id, old.daysOfWeek);
    await deleteTimetableEntry(String(id));
    router.back();
  }, [id]);

  return (
    <ScreenShell title={isEdit ? 'Edit class' : 'Add class'} subtitle="Personal timetable">
      <Field label="Class name">
        <TextInput
          value={className}
          onChangeText={setClassName}
          placeholder="e.g. Operating Systems"
          style={styles.input}
        />
      </Field>

      <View style={styles.row}>
        <Field label="Start">
          <TextInput value={startTime} onChangeText={setStartTime} style={styles.inputMono} />
        </Field>
        <Field label="End">
          <TextInput value={endTime} onChangeText={setEndTime} style={styles.inputMono} />
        </Field>
      </View>

      <Field label="Class type">
        <View style={styles.segmentRow}>
          {CLASS_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setClassType(type)}
              style={[styles.segment, classType === type && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  classType === type && styles.segmentTextActive,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Repeats on">
        <View style={styles.dayRow}>
          {DAYS.map((d) => (
            <Pressable
              key={d}
              onPress={() => toggleDay(d)}
              style={[styles.dayBox, daysOfWeek.includes(d) && styles.dayBoxActive]}
            >
              <Text
                style={[
                  styles.dayBoxText,
                  daysOfWeek.includes(d) && styles.dayBoxTextActive,
                ]}
              >
                {d[0].toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Room (optional)">
        <TextInput value={room} onChangeText={setRoom} style={styles.input} />
      </Field>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Remind me 10 minutes before</Text>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ false: AppColors.borderNeutral, true: AppColors.jodhpurIndigo }}
        />
      </View>

      <PrimaryButton label="Save" onPress={() => void save()} />
      {isEdit ? (
        <SecondaryButton label="Delete class" onPress={() => void remove()} />
      ) : null}
    </ScreenShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: AppSpacing.xs },
  label: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
  },
  input: {
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    padding: AppSpacing.md,
    ...AppTypography.body,
  },
  inputMono: {
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    padding: AppSpacing.md,
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
    borderColor: AppColors.borderNeutral,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: AppColors.jodhpurIndigo,
    borderColor: AppColors.jodhpurIndigo,
  },
  segmentText: {
    ...AppTypography.bodySmall,
    color: AppColors.inkSlate,
    textTransform: 'capitalize',
  },
  segmentTextActive: { color: AppColors.desertSand },
  dayRow: { flexDirection: 'row', gap: AppSpacing.xs },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxActive: {
    backgroundColor: AppColors.jodhpurIndigo,
    borderColor: AppColors.jodhpurIndigo,
  },
  dayBoxText: { ...AppTypography.caption, color: AppColors.mutedText },
  dayBoxTextActive: { color: AppColors.desertSand },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { ...AppTypography.body, color: AppColors.inkSlate, flex: 1 },
});
