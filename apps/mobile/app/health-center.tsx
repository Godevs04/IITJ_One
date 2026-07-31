import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_HEALTH_CENTER_DOC } from '@iitj1/types';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { InfoCard } from '@/healthCenter/widgets/InfoCard';
import { FacilityGrid } from '@/healthCenter/widgets/FacilityGrid';
import { FACILITIES, STUDENT_HEALTHCARE_INFO, ABOUT_TEXT } from '@/healthCenter/data/healthCenterData';
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

function PrimaryButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const theme = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={theme.onPrimary} />
      <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>{label}</Text>
    </Pressable>
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

  return (
    <ScreenShell
      title="🏥 Health Center"
      subtitle="24×7 Healthcare Services — Indian Institute of Technology Jodhpur"
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      {/* Official website */}
      <InfoCard icon="globe-outline" title="Official Health Center Website">
        <Text style={[styles.body, { color: theme.textMuted }]}>
          View the official IIT Jodhpur Health Center website for announcements, policies, schedules and
          additional information.
        </Text>
        <PrimaryButton label="Open Website" icon="open-outline" onPress={openOfficialSite} />
      </InfoCard>

      {/* Today's Doctors — one tab per worksheet the sheet actually has, shift-based (Morning/Evening/Night) roster per day */}
      <Section title="Today's Doctors">
        {dateTabs.length > 0 ? <DateTabs dates={dateTabs} selected={activeDate ?? ''} onSelect={setSelectedDate} /> : null}
        <InfoCard icon="calendar-outline" title={selectedDay ? `${selectedDay.day} Shift Duty Roster` : 'Shift Duty Roster'}>
          {selectedDay && selectedDay.regularDoctors.length > 0 ? (
            <View style={{ gap: AppSpacing.sm }}>
              {selectedDay.regularDoctors.map((entry, i) => (
                <View key={i} style={styles.shiftRow}>
                  <View style={[styles.shiftPill, { backgroundColor: theme.errorTint }]}>
                    <Text style={[styles.shiftPillText, { color: theme.error }]}>{entry.shift}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.body, { color: theme.text, fontWeight: '600' }]}>{entry.doctorName}</Text>
                    <Text style={[styles.note, { color: theme.textMuted, fontStyle: 'normal' }]}>
                      {entry.room} • {entry.timing}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.body, { color: theme.textMuted }]}>
              Today's schedule isn't available yet — check the official website for the latest doctor
              schedule.
            </Text>
          )}
          <PrimaryButton label="View Full Schedule" icon="open-outline" onPress={openDoctorSchedule} />
        </InfoCard>
      </Section>

      {/* Medical officers */}
      <Section title="Medical Officers">
        <View style={{ gap: AppSpacing.sm }}>
          {doc.medicalOfficers.map((officer) => (
            <DirectoryRow key={officer.name} title={officer.name} subtitle={officer.designation} />
          ))}
        </View>
      </Section>

      {/* Visiting specialists for the selected day — real doctor+qualification+room+timing when the schedule has data, specialty chips otherwise */}
      <Section title="Visiting Specialists">
        {visitingSpecialistsToShow.some((s) => s.doctorName) ? (
          <View style={{ gap: AppSpacing.sm }}>
            {visitingSpecialistsToShow.map((s, i) => (
              <DirectoryRow
                key={`${s.doctorName ?? s.specialty}-${i}`}
                title={s.doctorName ?? s.specialty}
                subtitle={[s.specialty, s.qualification, s.room, s.timing].filter(Boolean).join(' • ')}
              />
            ))}
          </View>
        ) : (
          <View style={styles.chipRow}>
            {visitingSpecialistsToShow.map((s) => (
              <View key={s.specialty} style={[styles.chip, { backgroundColor: theme.errorTint }]}>
                <Text style={[styles.chipLabel, { color: theme.error }]}>{s.specialty}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.note, { color: theme.textMuted }]}>
          Specialist schedules are announced by the Institute and updated regularly.
        </Text>
      </Section>

      {/* Healthcare services */}
      <Section title="Healthcare Services">
        <View style={{ gap: AppSpacing.xs }}>
          {doc.services.map((service) => (
            <View key={service} style={styles.serviceRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.secondary} />
              <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{service}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* Empanelled hospitals */}
      <Section title="Empanelled Hospitals">
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

      {/* Important contacts */}
      <Section title="Important Contacts">
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

      {/* Location */}
      <Section title="Location">
        <InfoCard icon="location-outline" title="Office of Health Center">
          <Text style={[styles.body, { color: theme.textMuted }]}>{doc.address}</Text>
          <View style={styles.buttonRow}>
            <PrimaryButton label="Navigate" icon="navigate-outline" onPress={openInMaps} />
            <PrimaryButton label="Copy Address" icon="copy-outline" onPress={copyAddress} />
          </View>
        </InfoCard>
      </Section>

      {/* Student healthcare */}
      <Section title="Student Healthcare">
        <View style={{ gap: AppSpacing.sm }}>
          {STUDENT_HEALTHCARE_INFO.map((item) => (
            <View key={item} style={styles.serviceRow}>
              <Ionicons name="heart-circle-outline" size={16} color={theme.error} />
              <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* Facilities */}
      <Section title="Facilities">
        <FacilityGrid items={FACILITIES} />
      </Section>

      {/* About */}
      <Section title="About">
        <InfoCard icon="information-circle-outline" title="IIT Jodhpur Health Center">
          <Text style={[styles.body, { color: theme.textMuted }]}>{ABOUT_TEXT}</Text>
        </InfoCard>
      </Section>

      {/* Bottom reference card */}
      <InfoCard icon="school-outline" title="Official Reference">
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Always refer to the official IIT Jodhpur Health Center website for the latest schedules,
          announcements and policies.
        </Text>
        <PrimaryButton label="Open Official Website" icon="open-outline" onPress={openOfficialSite} />
      </InfoCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.sectionLabel,
  },
  body: {
    ...AppTypography.bodySmall,
  },
  note: {
    ...AppTypography.caption,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  chip: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  chipLabel: {
    ...AppTypography.caption,
    fontWeight: '600',
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
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
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
