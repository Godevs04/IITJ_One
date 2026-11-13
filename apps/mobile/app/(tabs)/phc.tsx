import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DEFAULT_HEALTH_CENTER_DOC } from '@iitj1/types';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useCampusSync } from '@/hooks/useCampusSync';
import {
  currentShift,
  dialableNumber,
  formatRosterDate,
  formatTiming,
  istNow,
  nightWindow,
  orderContacts,
  rosterDateFor,
  rosterFor,
  visitsFor,
  type Shift,
} from '@/phc/phcLogic';
import type { HealthCenterDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

const GENERAL_PHYSICIAN = 'General Physician';
const normaliseName = (name: string) => name.toLowerCase().replace(/^dr\.?\s*/, '').replace(/\s+/g, ' ').trim();

/** Opens the phone's dialer with the number filled in; the user places the call themselves. */
async function openDialer(phone: string, label: string): Promise<void> {
  const number = dialableNumber(phone);
  if (!number) {
    Alert.alert('No valid number', `${label} does not have a number that can be dialled.`);
    return;
  }
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert('Could not open the dialer', `${label}: ${phone}`, [
      { text: 'Copy number', onPress: () => void Clipboard.setStringAsync(phone) },
      { text: 'OK', style: 'cancel' },
    ]);
  }
}

function SectionHeading({ children }: { children: string }) {
  const theme = useThemeColors();
  return (
    <Text style={[styles.sectionHeading, { color: theme.text }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Name and specialisation on the left, timing on the right. */
function PersonRow({ name, sub, timing, last }: { name: string; sub?: string; timing?: string; last: boolean }) {
  const theme = useThemeColors();
  return (
    <View
      accessible
      accessibilityLabel={[name, sub, timing].filter(Boolean).join(', ')}
      style={[styles.personRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
    >
      <View style={styles.personText}>
        <Text style={[styles.personName, { color: theme.text }]}>{name}</Text>
        {sub ? <Text style={[styles.personSub, { color: theme.textMuted }]}>{sub}</Text> : null}
      </View>
      {timing ? <Text style={[styles.personTiming, { color: theme.text }]}>{timing}</Text> : null}
    </View>
  );
}

/** Screen 15 — Primary Health Care. Read-only: a published duty roster, visiting specialists and phone numbers. */
export default function PhcScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const synced = useCampusModule<HealthCenterDoc>('healthCenter');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const schedules = synced?.doctorSchedules ?? [];
  const night = useMemo(() => nightWindow(schedules), [schedules]);
  const autoShift = currentShift(istNow(now).minutes, night);
  // The shift follows the clock until the user picks one; picking never changes the device or schedule.
  const [picked, setPicked] = useState<Shift | null>(null);
  const shift = picked ?? autoShift;

  const date = rosterDateFor(now, shift, night);
  const isToday = date === istNow(now).dateKey;
  const day = schedules.find((s) => s.date === date) ?? null;
  const roster = rosterFor(schedules, date, shift);
  const visits = visitsFor(day?.visitingSpecialists ?? [], shift, night);

  const officers = synced?.medicalOfficers?.length ? synced.medicalOfficers : DEFAULT_HEALTH_CENTER_DOC.medicalOfficers;
  const specialisationFor = (doctorName: string): string => {
    const key = normaliseName(doctorName);
    const specialist = (day?.visitingSpecialists ?? []).find((s) => s.doctorName && normaliseName(s.doctorName) === key);
    if (specialist) return specialist.specialty;
    return officers.find((o) => normaliseName(o.name) === key)?.designation || GENERAL_PHYSICIAN;
  };

  const contacts = orderContacts(
    (synced?.contacts?.length ? synced.contacts : DEFAULT_HEALTH_CENTER_DOC.contacts).filter(
      (c) => !['Campus Security', 'Ambulance', 'Fire'].includes(c.label) && !['100', '108', '101'].includes(c.phone),
    ),
  );

  const lastSynced = synced?.lastSyncedAt ? new Date(synced.lastSyncedAt) : null;
  const staleNote = !synced
    ? 'Showing saved contacts. Pull down to load the latest duty roster.'
    : synced.dataSource === 'static' || !lastSynced
      ? 'Roster not synced yet. Showing saved information.'
      : `Roster updated ${lastSynced.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`;

  const onRefresh = useCallback(async () => {
    await sync();
    setNow(new Date());
  }, [sync]);

  return (
    <ScreenShell
      title="Primary Health Care"
      subtitle="24×7 Healthcare at IIT Jodhpur"
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      <View style={styles.shifts} accessibilityRole="radiogroup">
        {(['day', 'night'] as const).map((key) => {
          const selected = shift === key;
          return (
            <Pressable
              key={key}
              onPress={() => setPicked(key)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={selected ? `${key} shift selected` : `Show ${key} shift`}
              style={[
                styles.shift,
                {
                  backgroundColor: selected ? theme.chipActiveBackground : theme.chipBackground,
                  borderColor: selected ? theme.chipActiveBackground : theme.border,
                },
              ]}
            >
              <MaterialIcons
                name={key === 'day' ? 'light-mode' : 'dark-mode'}
                size={18}
                color={selected ? theme.chipActiveText : theme.text}
              />
              <Text style={[styles.shiftText, { color: selected ? theme.chipActiveText : theme.text, fontWeight: selected ? '700' : '500' }]}>
                {key === 'day' ? 'DAY' : 'NIGHT'}
              </Text>
              {selected ? <MaterialIcons name="check" size={16} color={theme.chipActiveText} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <SectionHeading>Doctors on Duty</SectionHeading>
        {!isToday ? (
          <Text style={[styles.note, { color: theme.textMuted }]}>Roster for {formatRosterDate(date)}</Text>
        ) : null}
        {roster.length > 0 ? (
          <View>
            {roster.map((d, i) => (
              <PersonRow
                key={`${d.doctorName}-${d.timing}`}
                name={d.doctorName}
                sub={specialisationFor(d.doctorName)}
                timing={formatTiming(d.timing)}
                last={i === roster.length - 1}
              />
            ))}
            <Text style={[styles.note, { color: theme.textMuted }]}>Scheduled duty — not a confirmation that a doctor is present.</Text>
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Duty schedule not available.</Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading>Special Visit</SectionHeading>
        {visits.length > 0 ? (
          <View>
            {visits.map((v, i) => (
              <PersonRow
                key={`${v.doctorName ?? v.specialty}-${i}`}
                name={v.doctorName ?? v.specialty}
                sub={v.doctorName ? v.specialty : undefined}
                timing={v.timing ? formatTiming(v.timing) : undefined}
                last={i === visits.length - 1}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>No special visits scheduled.</Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading>IMPORTANT CONTACTS</SectionHeading>
        {contacts.map((c, i) => {
          const callable = dialableNumber(c.phone) != null;
          return (
            <View
              key={c.label}
              style={[styles.contactRow, i < contacts.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
            >
              <Text style={[styles.personName, styles.personText, { color: theme.text }]}>{c.label}</Text>
              <Pressable
                onPress={() => void openDialer(c.phone, c.label)}
                disabled={!callable}
                accessibilityRole="button"
                accessibilityLabel={callable ? `Call ${c.label}` : `${c.label} has no number available`}
                style={({ pressed }) => [
                  styles.call,
                  { backgroundColor: callable ? theme.primary : theme.surfaceMuted },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name="call" size={22} color={callable ? theme.onPrimary : theme.iconMuted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={[styles.note, { color: theme.textMuted }]}>{staleNote}</Text>
      <Pressable onPress={() => router.push('/health-center')} accessibilityRole="link" style={styles.moreLink}>
        <Text style={[styles.moreText, { color: theme.linkText }]}>More about the Health Center</Text>
        <MaterialIcons name="arrow-forward" size={16} color={theme.linkText} />
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shifts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shift: {
    flex: 1,
    minHeight: 48,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  shiftText: {
    ...AppTypography.bodyHeader,
    letterSpacing: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeading: {
    ...AppTypography.h2,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  personText: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    ...AppTypography.bodyHeader,
  },
  personSub: {
    ...AppTypography.bodySmall,
  },
  personTiming: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '48%',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
  },
  call: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    ...AppTypography.bodySmall,
  },
  empty: {
    ...AppTypography.body,
    paddingVertical: spacing.sm,
  },
  moreLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  moreText: {
    ...AppTypography.bodyHeader,
  },
  pressed: {
    opacity: 0.8,
  },
});
