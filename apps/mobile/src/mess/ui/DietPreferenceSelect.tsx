import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DietMark } from '@/components/DietMark';
import { useModalOverlayLock } from '@/services/overlayGate';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { DIET_OPTIONS, type DietPreference } from '../dietPreference';

interface Anchor {
  top: number;
  right: number;
}

/** "● Veg ▾" pill that opens a small menu of the available mess menus. */
export function DietPreferenceSelect({
  value,
  onChange,
}: {
  value: DietPreference;
  onChange: (pref: DietPreference) => void;
}) {
  const theme = useThemeColors();
  const pillRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);
  useModalOverlayLock(anchor != null);

  const selected = DIET_OPTIONS.find((o) => o.key === value) ?? DIET_OPTIONS[0];

  const open = () => {
    pillRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height + AppSpacing.xs, right: x + width });
    });
  };

  return (
    <>
      <Pressable
        ref={pillRef}
        onPress={open}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Menu: ${selected.label}. Change menu`}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <DietMark type={selected.key} size={12} />
        <Text style={[styles.pillText, { color: theme.text }]}>{selected.label}</Text>
        <MaterialIcons name="expand-more" size={18} color={theme.textMuted} />
      </Pressable>

      <Modal visible={anchor != null} transparent animationType="fade" onRequestClose={() => setAnchor(null)} statusBarTranslucent>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setAnchor(null)}
          onLayout={(e) => setWindowWidth(e.nativeEvent.layout.width)}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
        {anchor ? (
          <View
            accessibilityRole="menu"
            style={[
              styles.menu,
              {
                top: anchor.top,
                right: Math.max(AppSpacing.lg, windowWidth - anchor.right),
                backgroundColor: theme.surfaceRaised,
                borderColor: theme.border,
              },
            ]}
          >
            {DIET_OPTIONS.map((option, i) => {
              const isSelected = option.key === value;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    onChange(option.key);
                    setAnchor(null);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.item,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                    pressed && { backgroundColor: theme.primaryTint },
                  ]}
                >
                  <DietMark type={option.key} size={12} />
                  <Text style={[styles.itemText, { color: theme.text, fontWeight: isSelected ? '700' : '400' }]}>
                    {option.label}
                  </Text>
                  <MaterialIcons name="check" size={18} color={isSelected ? theme.linkText : 'transparent'} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    minHeight: 32,
    paddingLeft: AppSpacing.sm + 4,
    paddingRight: AppSpacing.xs,
    borderRadius: AppRadius.full,
    borderWidth: 1,
  },
  pillText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  menu: {
    position: 'absolute',
    minWidth: 160,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    minHeight: 44,
    paddingHorizontal: AppSpacing.lg,
  },
  itemText: {
    ...AppTypography.body,
    flex: 1,
  },
});
