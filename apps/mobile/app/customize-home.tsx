import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import {
  DEFAULT_HOME_LAYOUT,
  HOME_SECTIONS,
  saveHomeLayout,
  useHomeLayout,
  type HomeSectionKey,
} from '@/services/homeLayout';

/** Rows are a fixed height so a drag distance maps straight to a target index. */
const ROW_HEIGHT = 64;
const ROW_GAP = AppSpacing.sm;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;

const META = Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s])) as Record<
  HomeSectionKey,
  (typeof HOME_SECTIONS)[number]
>;

export default function CustomizeHomeScreen() {
  const theme = useThemeColors();
  const layout = useHomeLayout();
  const [order, setOrder] = useState<HomeSectionKey[]>(layout.order);
  const hidden = useMemo(() => new Set(layout.hidden), [layout.hidden]);
  const [draggingKey, setDraggingKey] = useState<HomeSectionKey | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;

  // Latest values for the PanResponder callbacks, which are created once.
  const orderRef = useRef(order);
  orderRef.current = order;
  const hiddenRef = useRef(layout.hidden);
  hiddenRef.current = layout.hidden;
  const drag = useRef({ key: null as HomeSectionKey | null, startIndex: 0, index: 0 });

  // Pick up the persisted layout once it loads (and after "Reset").
  useEffect(() => {
    if (!drag.current.key) setOrder(layout.order);
  }, [layout.order]);

  const responders = useMemo(() => {
    const make = (key: HomeSectionKey) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const index = orderRef.current.indexOf(key);
          drag.current = { key, startIndex: index, index };
          dragY.setValue(0);
          setDraggingKey(key);
        },
        onPanResponderMove: (_, { dy }) => {
          const { startIndex } = drag.current;
          const last = orderRef.current.length - 1;
          const target = Math.max(0, Math.min(last, startIndex + Math.round(dy / ROW_STRIDE)));
          if (target !== drag.current.index) {
            const next = orderRef.current.filter((k) => k !== key);
            next.splice(target, 0, key);
            drag.current.index = target;
            orderRef.current = next;
            setOrder(next);
          }
          // The row already sits in its new slot; only the leftover finger offset is animated.
          dragY.setValue(dy - (drag.current.index - startIndex) * ROW_STRIDE);
        },
        onPanResponderRelease: () => finish(),
        onPanResponderTerminate: () => finish(),
      });

    const finish = () => {
      drag.current.key = null;
      setDraggingKey(null);
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
      void saveHomeLayout({ order: orderRef.current, hidden: hiddenRef.current });
    };

    return Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, make(s.key)])) as Record<
      HomeSectionKey,
      ReturnType<typeof PanResponder.create>
    >;
  }, [dragY]);

  const setVisible = (key: HomeSectionKey, visible: boolean) => {
    const nextHidden = visible ? layout.hidden.filter((k) => k !== key) : [...layout.hidden, key];
    void saveHomeLayout({ order, hidden: nextHidden });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      scrollEnabled={draggingKey === null}
    >
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Drag <Ionicons name="reorder-three" size={14} color={theme.textMuted} /> to reorder your Home screen. Turn off
        anything you don&apos;t use.
      </Text>

      <View style={{ gap: ROW_GAP }}>
        {order.map((key) => {
          const meta = META[key];
          const isDragging = draggingKey === key;
          const visible = !hidden.has(key);
          return (
            <Animated.View
              key={key}
              style={[
                styles.row,
                {
                  backgroundColor: theme.surface,
                  borderColor: isDragging ? theme.linkText : theme.border,
                  opacity: visible ? 1 : 0.6,
                  zIndex: isDragging ? 10 : 0,
                  elevation: isDragging ? 6 : 0,
                  transform: [{ translateY: isDragging ? dragY : 0 }, { scale: isDragging ? 1.02 : 1 }],
                },
              ]}
            >
              <View
                {...responders[key].panHandlers}
                style={styles.handle}
                accessibilityRole="adjustable"
                accessibilityLabel={`Reorder ${meta.label}`}
                hitSlop={8}
              >
                <Ionicons name="reorder-three" size={26} color={isDragging ? theme.linkText : theme.iconMuted} />
              </View>
              <Ionicons name={meta.icon} size={20} color={theme.linkText} />
              <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
                {meta.label}
              </Text>
              <Switch
                value={visible}
                onValueChange={(value) => setVisible(key, value)}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
                ios_backgroundColor={theme.border}
                accessibilityLabel={`Show ${meta.label} on Home`}
              />
            </Animated.View>
          );
        })}
      </View>

      <Pressable
        onPress={() => void saveHomeLayout(DEFAULT_HOME_LAYOUT)}
        style={({ pressed }) => [styles.reset, { borderColor: theme.border }, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={16} color={theme.linkText} />
        <Text style={[styles.resetText, { color: theme.linkText }]}>Reset to default</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  hint: {
    ...AppTypography.bodySmall,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    paddingRight: AppSpacing.md,
  },
  handle: {
    height: '100%',
    paddingHorizontal: AppSpacing.md,
    justifyContent: 'center',
  },
  label: {
    ...AppTypography.body,
    fontWeight: '600',
    flex: 1,
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
  },
  resetText: {
    ...AppTypography.body,
    fontWeight: '600',
  },
});
