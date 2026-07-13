import { useCallback } from 'react';
import { StyleSheet, Text, View, Linking, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentCard } from '@/components/ContentCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { AboutDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const DISCLAIMER =
  'IITJ One is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.';

const INSTITUTE_DETAILS = [
  {
    title: 'About IITJ One',
    body: 'IITJ One is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.',
  },
  {
    title: 'IIT Jodhpur',
    body: 'Indian Institute of Technology Jodhpur is a public technical university and an Institute of National Importance by the Government of India. Located in Jodhpur, Rajasthan, IITJ is committed to excellence in education, research, and innovation.',
  },
  {
    title: 'Institute Details',
    body: 'Founded in 2008, IITJ is a fully residential campus spanning 852 acres. The current director is Prof. Avinash Kumar Agarwal. With a total enrollment of 2,574 students (2026), the institute maintains a strong academic environment.',
  },
  {
    title: 'Campus Location',
    body: 'NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan - 342030, India',
  },
  {
    title: 'Academic Excellence',
    body: 'IITJ ranks 27th in NIRF Engineering Rankings (2025) and 66th in NIRF Overall Rankings (2025). QS World University Ranking: 661-680 (2026). The institute offers 16 academic departments including Aerospace Engineering, Computer Science, Mechanical Engineering, and many others.',
  },
  {
    title: 'Academic Programs',
    body: 'Undergraduate: B.Tech programs in 10 specializations (CS, AI & Data Science, Electrical, Mechanical, Bioengineering, Materials, Chemical, Civil, Electronics, Aerospace), B.Sc in 4 specializations, and Integrated Teacher Education Programme (ITEP).\n\nPostgraduate: M.Tech with specializations in AR/VR, Robotics, Microelectronics & VLSI, Drone Technologies, and Battery Materials; M.Sc programs in Chemistry, Mathematics, Physics, Digital Humanities, and Computational Social Science; MBA; and Ph.D. with interdisciplinary focus in Smart Healthcare, Space Science, and Quantum Information.',
  },
  {
    title: 'Innovation & Facilities',
    body: 'Technology Innovation and Start-up Center (IITJ-TISC) for entrepreneurship support, S. R. Ranganathan Learning Hub, AIOT Fab Facility, Central Research Facility (CRF), and Digital Infrastructure & Automation (DIA) center.',
  },
  {
    title: 'Contact Information',
    body: 'General Inquiries: +91-291-2801079, +91-291-2801138\n\nJEE Admission: office_jee@iitj.ac.in\n\nLibrary: office_library@iitj.ac.in\n\nOfficial Website: https://www.iitj.ac.in/',
  },
];

function ContactRow({
  icon,
  label,
  value,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.contactRow,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.contactLeft}>
        <Ionicons name={icon} size={20} color={theme.primary} />
        <View>
          <Text style={[styles.contactLabel, { color: theme.textMuted }]}>
            {label}
          </Text>
          <Text style={[styles.contactValue, { color: theme.text }]} numberOfLines={2}>
            {value}
          </Text>
        </View>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={theme.iconMuted} /> : null}
    </Pressable>
  );
}

export default function AboutScreen() {
  const theme = useThemeColors();
  const { syncing, sync } = useCampusSync(false);
  const about = readCachedModule<AboutDoc>('about');
  const syncedSections = about?.sections ?? [];
  const sections = syncedSections.length > 0 ? syncedSections : INSTITUTE_DETAILS;

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Campus information"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <View style={[styles.disclaimer, { backgroundColor: theme.primaryTint }]}>
        <Text style={[styles.disclaimerText, { color: theme.primary }]}>
          {DISCLAIMER}
        </Text>
      </View>

      {sections.map((section) => (
        <ContentCard key={section.title} title={section.title}>
          <Text style={[styles.body, { color: theme.text }]}>{section.body}</Text>
        </ContentCard>
      ))}

      <View style={styles.contactSection}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          Quick Contact
        </Text>
        <ContactRow
          icon="call-outline"
          label="General Inquiries"
          value="+91-291-2801079"
          onPress={() => Linking.openURL('tel:+91-291-2801079')}
          theme={theme}
        />
        <ContactRow
          icon="mail-outline"
          label="JEE Admission"
          value="office_jee@iitj.ac.in"
          onPress={() => Linking.openURL('mailto:office_jee@iitj.ac.in')}
          theme={theme}
        />
        <ContactRow
          icon="book-outline"
          label="Library Services"
          value="office_library@iitj.ac.in"
          onPress={() => Linking.openURL('mailto:office_library@iitj.ac.in')}
          theme={theme}
        />
        <ContactRow
          icon="globe-outline"
          label="Official Website"
          value="https://www.iitj.ac.in/"
          onPress={() => Linking.openURL('https://www.iitj.ac.in/')}
          theme={theme}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
  },
  disclaimerText: {
    ...AppTypography.bodySmall,
  },
  body: {
    ...AppTypography.body,
  },
  contactSection: {
    gap: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.sectionLabel,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  contactLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  contactLabel: {
    ...AppTypography.caption,
  },
  contactValue: {
    ...AppTypography.bodySmall,
  },
});
