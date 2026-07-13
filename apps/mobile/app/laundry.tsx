import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import {
  DEFAULT_LAUNDRY_PREFERENCES,
  HOSTELS,
  REMINDER_OPTIONS,
  type Hostel,
  type LaundryPreferences,
  type NotificationPermissionStatus,
} from '@/laundry/types';
import { laundryScheduleProvider } from '@/laundry/services/scheduleService';
import { laundryPreferencesStore } from '@/laundry/services/preferencesStore';
import {
  getNotificationPermissionStatus,
  requestLaundryNotificationPermission,
  rescheduleLaundryNotifications,
} from '@/laundry/services/laundryNotifications';

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function LaundryScreen() {
  const theme = useThemeColors();
  const [prefs, setPrefs] = useState<LaundryPreferences>(DEFAULT_LAUNDRY_PREFERENCES);
  const [pickerOpen, setPickerOpen] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    setPrefs(laundryPreferencesStore.get());
  }, []);

  const schedule = useMemo(
    () => (prefs.hostel ? laundryScheduleProvider.getSchedule(prefs.hostel) : null),
    [prefs.hostel],
  );

  const minutesBefore = prefs.reminders[0]?.minutesBefore ?? 30;

  const persist = useCallback((next: LaundryPreferences) => {
    setPrefs(next);
    laundryPreferencesStore.save(next);
  }, []);

  const refreshPermissionStatus = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    const current = prefsRef.current;
    if (current.notificationPermissionStatus === status) return;
    persist({ ...current, notificationPermissionStatus: status });
  }, [persist]);

  useEffect(() => {
    void refreshPermissionStatus();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermissionStatus();
    });
    return () => subscription.remove();
  }, [refreshPermissionStatus]);

  const applyReminders = useCallback(
    async (next: LaundryPreferences, previousHostel: Hostel | null) => {
      const nextSchedule = next.hostel ? laundryScheduleProvider.getSchedule(next.hostel) : null;
      await rescheduleLaundryNotifications(
        previousHostel,
        nextSchedule,
        next.reminders[0]?.minutesBefore ?? 30,
        next.reminderEnabled,
      );
    },
    [],
  );

  const selectHostel = useCallback(
    (hostel: Hostel) => {
      setPickerOpen(false);
      const previousHostel = prefs.hostel;
      const next: LaundryPreferences = { ...prefs, hostel };
      persist(next);
      void applyReminders(next, previousHostel);
    },
    [prefs, persist, applyReminders],
  );

  const toggleReminder = useCallback(
    async (value: boolean) => {
      if (value) {
        const granted = await requestLaundryNotificationPermission();
        const status: NotificationPermissionStatus = granted ? 'granted' : 'denied';
        const next: LaundryPreferences = { ...prefs, reminderEnabled: granted, notificationPermissionStatus: status };
        persist(next);
        if (!granted) {
          Alert.alert(
            'Notifications disabled',
            'Enable notifications for IITJ1 in your device settings to get laundry reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
        await applyReminders(next, prefs.hostel);
      } else {
        const next: LaundryPreferences = { ...prefs, reminderEnabled: false };
        persist(next);
        await applyReminders(next, prefs.hostel);
      }
    },
    [prefs, persist, applyReminders],
  );

  const selectReminderMinutes = useCallback(
    async (mins: number) => {
      const next: LaundryPreferences = { ...prefs, reminders: [{ id: 'default', minutesBefore: mins }] };
      persist(next);
      await applyReminders(next, prefs.hostel);
    },
    [prefs, persist, applyReminders],
  );

  const hostelLabel = prefs.hostel ?? 'Select your hostel';

  return (
    <ScreenShell hideTitle subtitle="Laundry collection reminders">
      <Section title="Hostel Selection" theme={theme}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.selectRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.selectText, { color: prefs.hostel ? theme.text : theme.textMuted }]}>
            {hostelLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.iconMuted} />
        </Pressable>
      </Section>

      <Section title="Collection Schedule" theme={theme}>
        {schedule ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ScheduleRow label="Collection Day 1" value={DAY_LABELS[schedule.collectionDay1]} theme={theme} />
            <ScheduleRow label="Collection Day 2" value={DAY_LABELS[schedule.collectionDay2]} theme={theme} />
            <ScheduleRow label="Collection Time" value={schedule.collectionTime} theme={theme} />
            <ScheduleRow label="Location" value={schedule.location} theme={theme} />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Select a hostel to see its collection schedule.
            </Text>
          </View>
        )}
      </Section>

      <Section title="Reminder Settings" theme={theme}>
        <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>Enable Laundry Reminder</Text>
          <Switch
            value={prefs.reminderEnabled}
            onValueChange={(v) => void toggleReminder(v)}
            trackColor={{ false: theme.border, true: theme.primary }}
            disabled={!prefs.hostel}
          />
        </View>

        {prefs.reminderEnabled ? (
          <View style={styles.reminderOptions}>
            {REMINDER_OPTIONS.map((opt) => {
              const active = minutesBefore === opt.minutesBefore;
              return (
                <Pressable
                  key={opt.minutesBefore}
                  onPress={() => void selectReminderMinutes(opt.minutesBefore)}
                  style={[
                    styles.reminderChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primary : theme.chipBackground,
                    },
                  ]}
                >
                  <Text style={[styles.reminderChipText, { color: active ? theme.onPrimary : theme.chipText }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!prefs.hostel ? (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Select a hostel first to enable reminders.
          </Text>
        ) : null}
      </Section>

      <Section title="Notification Status" theme={theme}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statusRow}>
            <Ionicons
              name={
                prefs.notificationPermissionStatus === 'granted'
                  ? 'checkmark-circle'
                  : prefs.notificationPermissionStatus === 'denied'
                    ? 'close-circle'
                    : 'help-circle-outline'
              }
              size={20}
              color={
                prefs.notificationPermissionStatus === 'granted'
                  ? theme.veg
                  : prefs.notificationPermissionStatus === 'denied'
                    ? theme.error
                    : theme.iconMuted
              }
            />
            <Text style={[styles.statusText, { color: theme.text }]}>
              {prefs.notificationPermissionStatus === 'granted'
                ? 'Notifications enabled'
                : prefs.notificationPermissionStatus === 'denied'
                  ? 'Notifications denied'
                  : 'Notifications not yet requested'}
            </Text>
          </View>
          {prefs.notificationPermissionStatus === 'denied' ? (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={[styles.settingsLink, { color: theme.primary }]}>Open device settings</Text>
            </Pressable>
          ) : null}
        </View>
      </Section>

      <HostelPickerModal
        visible={pickerOpen}
        selected={prefs.hostel}
        onSelect={selectHostel}
        onClose={() => setPickerOpen(false)}
        theme={theme}
      />
    </ScreenShell>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function ScheduleRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.scheduleRow}>
      <Text style={[styles.scheduleLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.scheduleValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function HostelPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  selected: Hostel | null;
  onSelect: (h: Hostel) => void;
  onClose: () => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const boys = HOSTELS.filter((h) => h.category === 'boys');
  const girls = HOSTELS.filter((h) => h.category === 'girls');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: theme.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Hostel</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.iconMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalGroupLabel, { color: theme.textMuted }]}>Boys&apos; Hostels</Text>
            {boys.map((h) => (
              <HostelOptionRow key={h.id} hostel={h.id} selected={selected === h.id} onPress={() => onSelect(h.id)} theme={theme} />
            ))}
            <Text style={[styles.modalGroupLabel, { color: theme.textMuted }]}>Girls&apos; Hostels</Text>
            {girls.map((h) => (
              <HostelOptionRow key={h.id} hostel={h.id} selected={selected === h.id} onPress={() => onSelect(h.id)} theme={theme} />
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HostelOptionRow({
  hostel,
  selected,
  onPress,
  theme,
}: {
  hostel: Hostel;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.hostelOption,
        { borderColor: theme.border, backgroundColor: selected ? theme.primaryTint : theme.surface },
      ]}
    >
      <Text style={[styles.hostelOptionText, { color: theme.text }]}>{hostel}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: AppSpacing.sm },
  sectionLabel: { ...AppTypography.sectionLabel },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  selectText: { ...AppTypography.body },
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  emptyText: { ...AppTypography.body },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleLabel: { ...AppTypography.bodySmall },
  scheduleValue: { ...AppTypography.body, fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  toggleLabel: { ...AppTypography.body, flex: 1 },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  reminderChip: {
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  reminderChipText: { ...AppTypography.bodySmall },
  hint: { ...AppTypography.caption },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  statusText: { ...AppTypography.body },
  settingsLink: { ...AppTypography.button },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '75%',
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...AppTypography.h1 },
  modalContent: { gap: AppSpacing.sm, paddingBottom: AppSpacing.xl },
  modalGroupLabel: { ...AppTypography.sectionLabel, marginTop: AppSpacing.sm },
  hostelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  hostelOptionText: { ...AppTypography.body },
});
