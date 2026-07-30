import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { FeedbackPromptManager } from '@/services/feedbackPrompt';
import { isOverlayLocked, useModalOverlayLock } from '@/services/overlayGate';
import { Analytics, AppEvents } from '@/services/firebase';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const FEEDBACK_SCREEN_ROUTE = '/suggest';

// How long the current route must stay unchanged before the sheet is allowed
// to appear — avoids popping up mid navigation-transition.
const ROUTE_SETTLE_MS = 500;
const SWIPE_DISMISS_DISTANCE = 100;
const SWIPE_DISMISS_VELOCITY = 800;

/** "later" covers Maybe Later, X, swipe, and tap-outside — all soft dismissals treated the same by the manager. */
type DismissReason = 'later' | 'close' | 'swipe' | 'outside_tap';

export function FeedbackPromptSheet() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const pathname = usePathname();

  const [eligible, setEligible] = useState(false); // manager says: threshold crossed, not completed, cooldown elapsed
  const [routeSettled, setRouteSettled] = useState(true);
  const [rendered, setRendered] = useState(false); // keeps the Modal mounted through the exit animation
  // Guards against a rapid double-tap firing two dismiss/complete actions
  // (and duplicate analytics events) before the exit animation finishes.
  const closingRef = useRef(false);

  const visible = eligible && routeSettled;

  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  useModalOverlayLock(rendered);

  useEffect(() => FeedbackPromptManager.subscribe(() => setEligible(true)), []);

  // Debounce navigation transitions: only "settled" once the pathname has been stable for a beat.
  useEffect(() => {
    setRouteSettled(false);
    const timer = setTimeout(() => setRouteSettled(true), ROUTE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  const closeAnimated = useCallback((onDone?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(screenHeight, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(setRendered)(false);
        if (onDone) runOnJS(onDone)();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenHeight]);

  const handleDismiss = useCallback((reason: DismissReason) => {
    if (closingRef.current) return;
    closingRef.current = true;
    FeedbackPromptManager.markDismissed();
    Analytics.trackEvent(AppEvents.FEEDBACK_PROMPT_DISMISSED, { reason });
    closeAnimated(() => setEligible(false));
  }, [closeAnimated]);

  const handleGiveFeedback = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    FeedbackPromptManager.markCompleted();
    Analytics.trackEvent(AppEvents.FEEDBACK_PROMPT_FEEDBACK_CLICKED);
    closeAnimated(() => setEligible(false));

    // Avoid a duplicate/no-op navigation if the user is somehow already there.
    if (pathname === FEEDBACK_SCREEN_ROUTE) return;
    try {
      router.push('/suggest');
    } catch (err) {
      // Never crash over a failed navigation — the prompt is already closing itself.
      console.warn('[FeedbackPromptSheet] Failed to open feedback screen:', err);
    }
  }, [closeAnimated, pathname]);

  useEffect(() => {
    if (!visible) return;
    // Re-check right at the moment of showing: `eligible` can go stale during
    // the route-settle debounce if something else grabbed the overlay lock
    // in the meantime (e.g. a permission dialog opened right after we were
    // notified but before the route finished settling).
    if (isOverlayLocked()) {
      setEligible(false);
      return;
    }
    closingRef.current = false;
    setRendered(true);
    translateY.value = screenHeight;
    backdropOpacity.value = 0;
    translateY.value = withSpring(0, { damping: 18, stiffness: 140 });
    backdropOpacity.value = withTiming(1, { duration: 220 });
    Analytics.trackEvent(AppEvents.FEEDBACK_PROMPT_SHOWN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > SWIPE_DISMISS_DISTANCE || e.velocityY > SWIPE_DISMISS_VELOCITY) {
        translateY.value = withTiming(screenHeight, { duration: 200 }, (finished) => {
          if (finished) runOnJS(handleDismiss)('swipe');
        });
        backdropOpacity.value = withTiming(0, { duration: 200 });
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 140 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => handleDismiss('close')}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => handleDismiss('outside_tap')}
            accessibilityRole="button"
            accessibilityLabel="Dismiss feedback prompt"
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              { backgroundColor: theme.surface, paddingBottom: AppSpacing.lg + insets.bottom },
            ]}
            accessibilityViewIsModal
          >
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />

            <Pressable
              onPress={() => handleDismiss('close')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              accessibilityHint="Dismiss this feedback prompt. It may appear again later."
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={theme.iconMuted} />
            </Pressable>

            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              Help us improve IITJ One
            </Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              Your feedback helps us improve IITJ One for the IIT Jodhpur community.
            </Text>

            <View style={styles.actions}>
              <PrimaryButton
                label="💬 Give Feedback"
                onPress={handleGiveFeedback}
                accessibilityHint="Opens the feedback and suggestions screen"
              />
              <SecondaryButton
                label="Maybe Later"
                onPress={() => handleDismiss('later')}
                accessibilityHint="Dismiss for now. You may be asked again in about a month."
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: AppRadius.lg,
    borderTopRightRadius: AppRadius.lg,
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.md,
    gap: AppSpacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: AppSpacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: AppSpacing.md,
    right: AppSpacing.lg,
    padding: 4,
    zIndex: 1,
  },
  title: {
    ...AppTypography.h2,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    ...AppTypography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: AppSpacing.sm,
    marginTop: AppSpacing.sm,
  },
});
