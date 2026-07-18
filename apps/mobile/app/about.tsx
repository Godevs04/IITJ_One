import { useCallback } from 'react';
import { StyleSheet, Text, View, Linking, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentCard } from '@/components/ContentCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { AboutDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { debugListKeys } from '@/debug/listDebug';
import { isHttpUrl } from '@/utils/urlSafety';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const DISCLAIMER =
  'IITJ One is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.';

const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL;
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

const INSTITUTE_DETAILS = [
  {
    title: 'About IITJ One',
    body: 'IITJ One is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.',
  },
  {
    title: 'Indian Institute of Technology Jodhpur',
    body: 'A premier, autonomous public technical university located in Jodhpur, Rajasthan. Established in 2008 by the Ministry of Education, Government of India, IITJ is officially recognized as an Institute of National Importance. The university operates from a state-of-the-art, fully residential, 852-acre permanent campus situated on National Highway 62 (Nagaur Road) at Karwar, meticulously planned to support a sustainable and smart township ecosystem.',
  },
  {
    title: 'Campus & Infrastructure',
    body: 'The campus integrates green technologies with advanced educational architecture. Features include fully air-conditioned student hostels, modern recreational and wellness centers, sports facilities, the S. R. Ranganathan Learning Hub (digital and physical archives), and specialized research infrastructure.',
  },
  {
    title: 'Academic Profile',
    body: 'IITJ offers flexible, deeply multidisciplinary curriculum spanning undergraduate, postgraduate, and doctoral levels. Programs include B.Tech, M.Tech, M.Sc, MBA, Ph.D., B.Sc. (Physics, Chemistry, Mathematics & Computing, Management & Technology), and the 4-year Integrated Teacher Education Programme (ITEP - BSc-BEd).',
  },
  {
    title: 'Cutting-Edge Focus Areas',
    body: 'The academic curriculum emphasizes 21st-century technological transformations including Artificial Intelligence (AI), Computer Vision, Cyber-Physical Systems, Augmented & Virtual Reality (AR/VR), Robotics, Drone Technologies, Smart Healthcare, and Battery Materials Technology.',
  },
  {
    title: 'Academic Departments',
    body: 'Engineering: Computer Science, AI & Data Science, Electrical, Electronics, Mechanical, Aerospace, Bioengineering, Chemical, Materials, Civil & Infrastructure Engineering.\n\nSupporting Sciences: Fundamental sciences, Humanities, and Social Sciences.',
  },
  {
    title: 'Research & Innovation',
    body: 'Designed to foster innovative culture bridging academic research and commercial entrepreneurship. Key facilities:\n\n• Technology Innovation and Start-up Center (IITJ-TISC): Regional hub for entrepreneurship with incubation space, seed funding, prototyping tools, and mentorship.\n\n• Central Research Facility (CRF): Cutting-edge analytical instruments.\n\n• Digital Infrastructure & Automation (DIA): Advanced automation cell.\n\n• AIOT Fab Facility: Advanced prototyping capabilities.',
  },
  {
    title: 'Rankings & Recognition',
    body: 'NIRF Engineering Rank 2025: 27\n\nNIRF Overall Rank 2025: 66\n\nQS World University Ranking 2026: 661-680\n\nCurrent Director: Prof. Avinash Kumar Agarwal\n\nStudent Enrollment: 2,574 (2026)',
  },
  {
    title: 'Contact & Resources',
    body: 'General Inquiries: +91-291-2801079, +91-291-2801138\n\nJEE Admission: office_jee@iitj.ac.in\n\nLibrary Services: office_library@iitj.ac.in\n\nLocation: NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan - 342030, India\n\nOfficial Website: https://www.iitj.ac.in/',
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
  const { syncing, sync, error } = useCampusSync(false);
  const about = useCampusModule<AboutDoc>('about');
  const syncedSections = about?.sections ?? [];
  const sections = syncedSections.length > 0 ? syncedSections : INSTITUTE_DETAILS;
  debugListKeys('AboutScreen', 'sections', sections, (section) => section.title);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Campus information"
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      <View style={[styles.disclaimer, { backgroundColor: theme.primaryTint }]}>
        <Text style={[styles.disclaimerText, { color: theme.primary }]}>
          {DISCLAIMER}
        </Text>
      </View>

      {isHttpUrl(SUPPORT_URL) || SUPPORT_EMAIL ? (
        <View style={styles.contactSection}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
            IITJ One Support
          </Text>
          {isHttpUrl(SUPPORT_URL) ? (
            <ContactRow
              icon="help-circle-outline"
              label="Support"
              value="Help, FAQs & report a bug"
              onPress={() => Linking.openURL(SUPPORT_URL)}
              theme={theme}
            />
          ) : null}
          {SUPPORT_EMAIL ? (
            <ContactRow
              icon="mail-outline"
              label="Email us"
              value={SUPPORT_EMAIL}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              theme={theme}
            />
          ) : null}
        </View>
      ) : null}

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
