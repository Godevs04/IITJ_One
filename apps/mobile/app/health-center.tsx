import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '@/components/Icon';
import { DEFAULT_HEALTH_CENTER_DOC } from '@iitj1/types';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { InfoCard } from '@/healthCenter/widgets/InfoCard';
import type { HealthCenterDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, icon, onPress }: { label: string; icon: keyof typeof Icon.glyphMap; onPress: () => void }) {
  const theme = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={18} color={theme.onPrimary} />
      <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const GENERAL_PHYSICIAN = 'General Physician';

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/^dr\.?\s*/, '').replace(/\s+/g, ' ').trim();
}

/** One doctor per full-width row: name, then specialisation, then room/timing. */
function DoctorRow({
  name,
  specialisation,
  detail,
  badge,
}: {
  name: string;
  specialisation?: string;
  detail?: string;
  badge?: string;
}) {
  const theme = useThemeColors();
  return (
    <View style={[styles.doctorRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.doctorIcon, { backgroundColor: theme.errorTint }]}>
        <Icon name="medkit-outline" size={18} color={theme.error} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.doctorName, { color: theme.text }]}>{name}</Text>
        {specialisation ? (
          <Text style={[styles.doctorSpecialisation, { color: theme.secondary }]}>{specialisation}</Text>
        ) : null}
        {detail ? <Text style={[styles.doctorDetail, { color: theme.textMuted }]}>{detail}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.shiftPill, { backgroundColor: theme.errorTint }]}>
          <Text style={[styles.shiftPillText, { color: theme.error }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Date tabs are generated entirely from `doctorSchedules` — however many worksheets the sheet has, that many tabs appear. */
function DateTabs({
  dates,
  selected,
  onSelect,
}: {
  dates: { date: string; day: string }[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const theme = useThemeColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateTabsScroll}>
      <View style={styles.dateTabsRow}>
        {dates.map(({ date }) => {
          const isSelected = date === selected;
          const label = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
          });
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              style={[
                styles.dateTab,
                {
                  backgroundColor: isSelected ? theme.error : theme.surfaceMuted,
                  borderColor: isSelected ? theme.error : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show schedule for ${label}`}
            >
              <Text style={[styles.dateTabText, { color: isSelected ? theme.onPrimary : theme.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function HealthCenterScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const synced = useCampusModule<HealthCenterDoc>('healthCenter');
  const doc: Omit<HealthCenterDoc, 'campusId'> = {
    ...DEFAULT_HEALTH_CENTER_DOC,
    ...synced,
    medicalOfficers: synced?.medicalOfficers?.length ? synced.medicalOfficers : DEFAULT_HEALTH_CENTER_DOC.medicalOfficers,
    visitingSpecialists: synced?.visitingSpecialists?.length
      ? synced.visitingSpecialists
      : DEFAULT_HEALTH_CENTER_DOC.visitingSpecialists,
    doctorSchedules: synced?.doctorSchedules?.length ? synced.doctorSchedules : DEFAULT_HEALTH_CENTER_DOC.doctorSchedules,
    hospitals: synced?.hospitals?.length ? synced.hospitals : DEFAULT_HEALTH_CENTER_DOC.hospitals,
    contacts: (synced?.contacts?.length ? synced.contacts : DEFAULT_HEALTH_CENTER_DOC.contacts).filter(
      (c) => !['Campus Security', 'Ambulance', 'Fire'].includes(c.label) && !['100', '108', '101'].includes(c.phone),
    ),
    services: synced?.services?.length ? synced.services : DEFAULT_HEALTH_CENTER_DOC.services,
  };

  const dateTabs = useMemo(
    () => doc.doctorSchedules.map((s) => ({ date: s.date, day: s.day })),
    [doc.doctorSchedules],
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Default to today's tab if the sheet has one, otherwise the first available worksheet.
  const activeDate = useMemo(() => {
    if (selectedDate && dateTabs.some((t) => t.date === selectedDate)) return selectedDate;
    const today = new Date().toISOString().slice(0, 10);
    if (dateTabs.some((t) => t.date === today)) return today;
    return dateTabs[0]?.date ?? null;
  }, [selectedDate, dateTabs]);

  const selectedDay = doc.doctorSchedules.find((s) => s.date === activeDate) ?? null;
  // Every duty doctor usually sits in the same OPD room — say it once instead of on every row.
  const dutyRooms = new Set((selectedDay?.regularDoctors ?? []).map((d) => d.room).filter(Boolean));
  const sharedRoom = dutyRooms.size === 1 && (selectedDay?.regularDoctors.length ?? 0) > 1 ? [...dutyRooms][0] : null;
  const visitingSpecialistsToShow =
    selectedDay && selectedDay.visitingSpecialists.length > 0 ? selectedDay.visitingSpecialists : doc.visitingSpecialists;

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  const openOfficialSite = useCallback(() => {
    void Linking.openURL(doc.officialUrl);
  }, [doc.officialUrl]);

  const openDoctorSchedule = useCallback(() => {
    void Linking.openURL(doc.doctorScheduleUrl);
  }, [doc.doctorScheduleUrl]);

  const openInMaps = useCallback(() => {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doc.address)}`);
  }, [doc.address]);

  const copyAddress = useCallback(() => {
    void Clipboard.setStringAsync(doc.address);
  }, [doc.address]);

  // Shift doctors on the roster are the Health Center's own medical officers
  // (general physicians); a name that matches a visiting specialist gets their specialty instead.
  const specialisationFor = (doctorName: string): string => {
    const key = normaliseName(doctorName);
    const specialist = visitingSpecialistsToShow.find((s) => s.doctorName && normaliseName(s.doctorName) === key);
    if (specialist) return specialist.specialty;
    const officer = doc.medicalOfficers.find((o) => normaliseName(o.name) === key);
    return officer?.designation || GENERAL_PHYSICIAN;
  };

  return (
    <ScreenShell
      title="Health Center"
      subtitle="24×7 healthcare for the IIT Jodhpur campus"
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      {/* Today's Doctors — one tab per worksheet the sheet actually has, shift-based (Morning/Evening/Night) roster per day */}
      <Section title="Doctors on duty">
        {dateTabs.length > 0 ? <DateTabs dates={dateTabs} selected={activeDate ?? ''} onSelect={setSelectedDate} /> : null}
        {selectedDay && selectedDay.regularDoctors.length > 0 ? (
          <View style={styles.doctorList}>
            {sharedRoom ? (
              <View style={styles.sharedRoom}>
                <Icon name="location-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.sharedRoomText, { color: theme.textMuted }]}>{sharedRoom}</Text>
              </View>
            ) : null}
            {selectedDay.regularDoctors.map((entry, i) => (
              <DoctorRow
                key={`${entry.doctorName}-${entry.shift}-${i}`}
                name={entry.doctorName}
                specialisation={specialisationFor(entry.doctorName)}
                detail={[sharedRoom ? null : entry.room, entry.timing].filter(Boolean).join(' • ')}
                badge={entry.shift}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Today&apos;s roster isn&apos;t published yet. Check the full schedule for the latest.
          </Text>
        )}
        <PrimaryButton label="View full schedule" icon="open-outline" onPress={openDoctorSchedule} />
      </Section>

      {/* Visiting specialists for the selected day — one doctor per row, specialisation first */}
      <Section title="Visiting specialists">
        <View style={styles.doctorList}>
          {visitingSpecialistsToShow.map((s, i) => (
            <DoctorRow
              key={`${s.doctorName ?? s.specialty}-${i}`}
              name={s.doctorName ?? s.specialty}
              specialisation={s.doctorName ? s.specialty : undefined}
              detail={[s.qualification, s.room, s.timing].filter(Boolean).join(' • ') || undefined}
            />
          ))}
        </View>
      </Section>

      <Section title="Medical officers">
        <View style={styles.doctorList}>
          {doc.medicalOfficers.map((officer) => (
            <DoctorRow key={officer.name} name={officer.name} specialisation={officer.designation || GENERAL_PHYSICIAN} />
          ))}
        </View>
      </Section>

      <Section title="Important contacts">
        <View style={{ gap: AppSpacing.sm }}>
          {doc.contacts.map((contact) => (
            <DirectoryRow
              key={`${contact.label}-${contact.phone}`}
              title={contact.label}
              subtitle={contact.phone}
              phone={contact.phone}
              onCopy={() => void Clipboard.setStringAsync(contact.phone)}
            />
          ))}
        </View>
      </Section>

      <Section title="Empanelled hospitals">
        <View style={{ gap: AppSpacing.sm }}>
          {doc.hospitals.map((hospital) => (
            <DirectoryRow
              key={hospital.name}
              title={hospital.name}
              subtitle={hospital.address}
              phone={hospital.phone}
              onCopy={hospital.phone ? () => void Clipboard.setStringAsync(hospital.phone!) : undefined}
            />
          ))}
        </View>
      </Section>

      <Section title="Location">
        <InfoCard icon="location-outline" title="Office of Health Center">
          <Text style={[styles.body, { color: theme.textMuted }]}>{doc.address}</Text>
          <View style={styles.buttonRow}>
            <PrimaryButton label="Navigate" icon="navigate-outline" onPress={openInMaps} />
            <PrimaryButton label="Copy address" icon="copy-outline" onPress={copyAddress} />
          </View>
        </InfoCard>
      </Section>

      <Pressable onPress={openOfficialSite} hitSlop={8} style={styles.officialLink} accessibilityRole="link">
        <Text style={[styles.body, { color: theme.linkText, fontWeight: '600' }]}>Official Health Center website</Text>
        <Icon name="open-outline" size={14} color={theme.linkText} />
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sharedRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharedRoomText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  section: {
    gap: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.sectionLabel,
  },
  body: {
    ...AppTypography.bodySmall,
  },
  dateTabsScroll: {
    marginBottom: -AppSpacing.xs,
  },
  dateTabsRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    paddingBottom: AppSpacing.sm,
  },
  dateTab: {
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  dateTabText: {
    ...AppTypography.caption,
    fontWeight: '700',
  },
  doctorList: {
    gap: AppSpacing.sm,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
  },
  doctorIcon: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  doctorSpecialisation: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  doctorDetail: {
    ...AppTypography.caption,
  },
  officialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    paddingVertical: AppSpacing.sm,
  },
  shiftPill: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  shiftPillText: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
    alignSelf: 'flex-start',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  buttonLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
