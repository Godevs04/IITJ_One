import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Icon } from '@/components/Icon';
import { useFloatingTabBarInset } from '@/components/BottomTabBar';
import { HOME_SERVICES, QUICK_LINK_KEYS, type HomeService } from '@/services/homeServices';
import { openService } from '@/services/openService';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

const LINKS: HomeService[] = QUICK_LINK_KEYS.map((key) => HOME_SERVICES.find((s) => s.key === key)).filter(
  (s): s is (typeof HOME_SERVICES)[number] => s != null,
);

/**
 * Screen 07 — Quick Links: the campus services as a two-column grid, from the same registry Home pins from.
 * "Customize Your Home Screen" chooses which services appear on Home.
 */
export default function QuickLinksScreen() {
  const theme = useThemeColors();
  const inset = useFloatingTabBarInset();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, inset > 0 && { paddingBottom: inset }]}
    >
      <View style={styles.grid}>
        {LINKS.map((service) => (
          <Pressable
            key={service.key}
            onPress={() => void openService(service)}
            accessibilityRole="button"
            accessibilityLabel={service.destination.type === 'external' ? `${service.label}, opens a website` : service.label}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={service.icon} size={24} color={theme.text} />
            <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>
              {service.label}
            </Text>
            {service.destination.type === 'external' ? (
              <MaterialIcons name="open-in-new" size={14} color={theme.iconMuted} style={styles.external} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/customize-home')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.customize, pressed && styles.pressed]}
      >
        <MaterialIcons name="tune" size={18} color={theme.linkText} />
        <Text style={[styles.customizeText, { color: theme.linkText }]}>Customize Your Home Screen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.screenMargin,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48.8%',
    flexGrow: 1,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  label: {
    ...AppTypography.bodyHeader,
    flex: 1,
  },
  external: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  customize: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  customizeText: {
    ...AppTypography.bodyHeader,
  },
  pressed: {
    opacity: 0.7,
  },
});
