import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/Buttons';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.binarydots.fretboxresident';
const APP_STORE = 'https://apps.apple.com/in/app/fretbox-resident/id1505219868';

const steps = [
  {
    title: 'Sign in to FretBox Resident',
    text: 'Choose “My Hostel is using FretBox”, then “Sign In As Resident”. Select Email and enter your official IIT Jodhpur email address. Complete the security puzzle and enter the emailed OTP. Check spam if the code does not arrive.',
  },
  {
    title: 'Scan the dining hall QR during meal hours',
    text: 'On the FretBox dashboard, open “Today’s Meal” and tap “Scan QR”. Fit the entire QR code displayed at the mess outlet inside the red frame.',
  },
  {
    title: 'Show the meal token at the counter',
    text: 'Show the digital token to collect your meal. Wait until you receive your meal before tapping “OK”. The entry scan cannot be repeated.',
  },
];

export default function VegMessEntryScreen() {
  const theme = useThemeColors();
  const body = [styles.body, { color: theme.textMuted }];

  return (
    <ScreenShell title="Veg Mess entry" subtitle="Saroja Caterers · From 1 November 2026">
      <Text style={body}>
        Students mapped to Veg Mess for the month use FretBox Resident to scan the shared dining hall QR in place of their individual ERP QR. Billing and rebates follow the existing process.
      </Text>
      <PrimaryButton
        label={Platform.OS === 'ios' ? 'Get FretBox on the App Store' : 'Get FretBox on Google Play'}
        onPress={() => {
          void Linking.openURL(Platform.OS === 'ios' ? APP_STORE : PLAY_STORE).catch(() => {
            Alert.alert('Could not open the store', 'Search for FretBox Resident in your app store.');
          });
        }}
      />
      {steps.map((step, index) => (
        <View key={step.title} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
            {index + 1}. {step.title}
          </Text>
          <Text style={body}>{step.text}</Text>
        </View>
      ))}
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>If scanning fails</Text>
      <Text style={body}>
        Show your Institute ID card if scanning fails or you have no internet. The vendor can verify your Veg Mess mapping. Contact the mess office for profile corrections. FretBox allows one profile photo upload.
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  heading: { ...AppTypography.body, fontWeight: '600' },
  body: { ...AppTypography.body },
});
