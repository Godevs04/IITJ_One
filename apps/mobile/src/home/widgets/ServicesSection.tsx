import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Icon } from '@/components/Icon';
import {
  pinnedServices,
  saveHomeServices,
  useHomeServices,
  type HomeService,
  type HomeServiceKey,
} from '@/services/homeServices';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

type IconName = keyof typeof MaterialIcons.glyphMap;

/**
 * Home "Services" (Screen 01 §7): the user's pinned services in a two-column grid. Each card opens its
 * service; its ⋯ menu removes it from Home or opens the customise screen.
 */
export function ServicesSection({ onOpen }: { onOpen?: (service: HomeService) => void }) {
  const theme = useThemeColors();
  const layout = useHomeServices();
  const services = pinnedServices(layout);
  const [menuFor, setMenuFor] = useState<HomeService | null>(null);

  const open = (service: HomeService) => {
    onOpen?.(service);
    router.push(service.route);
  };

  const removeFromHome = (key: string) => {
    void saveHomeServices({ ...layout, hidden: [...layout.hidden, key as HomeServiceKey] });
  };

  const menuActions: { icon: IconName; label: string; run: (service: HomeService) => void }[] = [
    { icon: 'open-in-new', label: 'Open', run: open },
    { icon: 'remove-circle-outline', label: 'Remove from Home', run: (s) => removeFromHome(s.key) },
    { icon: 'swap-vert', label: 'Rearrange', run: () => router.push('/customize-home') },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.text }]} accessibilityRole="header">
          Services
        </Text>
        <Pressable
          onPress={() => router.push('/more')}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="More services"
          style={({ pressed }) => [styles.moreLink, pressed && styles.pressed]}
        >
          <Text style={[styles.moreText, { color: theme.linkText }]}>More</Text>
          <MaterialIcons name="arrow-forward" size={16} color={theme.linkText} />
        </Pressable>
      </View>

      {services.length === 0 ? (
        <Pressable
          onPress={() => router.push('/customize-home')}
          accessibilityRole="button"
          style={[styles.empty, { borderColor: theme.border }]}
        >
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No services pinned. Tap to choose what appears here.
          </Text>
        </Pressable>
      ) : (
        <View style={styles.grid}>
          {services.map((service) => (
            <View key={service.key} style={styles.cell}>
              <Pressable
                onPress={() => open(service)}
                accessibilityRole="button"
                accessibilityLabel={service.label}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Icon name={service.icon} size={24} color={theme.text} />
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                  {service.label}
                </Text>
              </Pressable>
              {/* A sibling of the card, not a child: a button inside a button is invalid on web. */}
              <Pressable
                onPress={() => setMenuFor(service)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Options for ${service.label}`}
                style={styles.menuButton}
              >
                <MaterialIcons name="more-horiz" size={22} color={theme.iconMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Modal visible={menuFor != null} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuFor(null)} accessibilityLabel="Close menu" />
          {menuFor ? (
            <View style={[styles.menu, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
              <Text style={[styles.menuTitle, { color: theme.text }]} accessibilityRole="header">
                {menuFor.label}
              </Text>
              {menuActions.map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => {
                    const service = menuFor;
                    setMenuFor(null);
                    action.run(service);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                >
                  <MaterialIcons name={action.icon} size={20} color={theme.text} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  heading: {
    ...AppTypography.sectionLabel,
    fontSize: 16,
    lineHeight: 24,
  },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moreText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    // Two columns with one 8 gutter between them.
    width: '48.8%',
    flexGrow: 1,
  },
  card: {
    minHeight: 96,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  menuButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...AppTypography.bodyHeader,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: AppRadius.md,
    padding: spacing.md,
  },
  emptyText: {
    ...AppTypography.body,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.screenMargin,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menu: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    borderRadius: AppRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  menuTitle: {
    ...AppTypography.h2,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuItemText: {
    ...AppTypography.body,
  },
  pressed: {
    opacity: 0.7,
  },
});
