import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { goBack } from '@/navigation/goBack';
import * as ImagePicker from 'expo-image-picker';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';
import { Icon } from '@/components/Icon';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { messQrStore, MessQrStorageError, type MessQR } from '@/services/qrStorage';
import { useQrAutoBrightnessPreference, useQrBrightness } from '@/services/qrBrightness';
import { Analytics, AppEvents, FirebaseCrashlytics } from '@/services/firebase';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography, RedesignColors } from '@/theme/tokens';
import { usePostHog } from 'posthog-react-native';

type Mode = 'empty' | 'cropping' | 'viewing';

const FADE_DELAY_MS = 3000;
/** The QR viewer is always light (white paper, dark ink) in both themes: that is what scanners read best. */
const QR_PAPER = '#FFFFFF';
const QR_INK = RedesignColors.text;
const QR_INK_MUTED = RedesignColors.textMuted;

function friendlyErrorMessage(err: unknown): string {
  if (err instanceof MessQrStorageError) {
    switch (err.reason) {
      case 'invalid_image':
        return err.message;
      case 'storage_full':
        return err.message;
      default:
        return 'Something went wrong saving your QR. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function MessQrScreen() {
  const theme = useThemeColors();
  const posthog = usePostHog();
  const [qr, setQr] = useState<MessQR | null>(null);
  const [mode, setMode] = useState<Mode>('empty');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageStatus, setImageStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [autoBrightness, setAutoBrightness] = useQrAutoBrightnessPreference();
  const insets = useSafeAreaInsets();

  const controlsOpacity = useSharedValue(1);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const isTap = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;
        if (isTap) {
          revealControlsRef.current();
        } else if (gestureState.dy > 50 || gestureState.vy > 0.25) {
          goBack();
        }
      },
    })
  ).current;

  useEffect(() => {
    let active = true;
    void messQrStore.get().then((value) => {
      if (!active) return;
      setQr(value);
      setMode(value ? 'viewing' : 'empty');
      setLoading(false);
      if (value) {
        Analytics.trackEvent(AppEvents.MESS_QR_OPENED);
        void FirebaseCrashlytics.log('Mess QR viewed');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const scheduleFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      controlsOpacity.value = withTiming(0, { duration: 400 });
    }, FADE_DELAY_MS);
  }, [controlsOpacity]);

  const revealControls = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 200 });
    scheduleFade();
  }, [controlsOpacity, scheduleFade]);
  // The PanResponder is created once; read the latest callback through a ref.
  const revealControlsRef = useRef(revealControls);
  revealControlsRef.current = revealControls;

  // Handle local control animations on mode change
  useEffect(() => {
    if (mode === 'viewing' && imageStatus === 'ok') {
      revealControls();
    } else {
      // Keep the controls visible while the image loads or when it cannot be shown.
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      controlsOpacity.value = withTiming(1, { duration: 150 });
    }
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [mode, imageStatus, revealControls, controlsOpacity]);

  // A new or changed image starts loading again.
  useEffect(() => {
    setImageStatus('loading');
  }, [qr?.imagePath]);

  // Keep the screen awake and block screenshots while the QR is shown.
  useFocusEffect(
    useCallback(() => {
      if (mode !== 'viewing') return;
      void activateKeepAwakeAsync('mess-qr');
      void preventScreenCaptureAsync();
      return () => {
        deactivateKeepAwake('mess-qr');
        void allowScreenCaptureAsync();
      };
    }, [mode]),
  );
  // Full brightness while the QR is visible (restored on leave and in the background), unless turned off.
  useQrBrightness(mode === 'viewing' && autoBrightness);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  async function requestPermissionOrPrompt(useCamera: boolean): Promise<boolean> {
    if (!useCamera) {
      // Android Photo Picker and iOS PHPicker grant access only to the selected
      // item — no broad gallery permission is required.
      return true;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Enable camera access in your device settings to take a photo of your QR.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  }

  const pickImage = useCallback(async (useCamera: boolean) => {
    const granted = await requestPermissionOrPrompt(useCamera);
    if (!granted) return;
    posthog.capture('mess_qr_upload_started', { source: useCamera ? 'camera' : 'gallery' });

    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, mediaTypes: ['images'] });

      if (!result.canceled && result.assets[0]) {
        setPendingImageUri(result.assets[0].uri);
        setMode('cropping');
      }
    } catch {
      Alert.alert('Something went wrong', 'Could not open the image picker. Please try again.');
    }
  }, [posthog]);

  const openReCrop = useCallback(() => {
    if (!qr) return;
    setPendingImageUri(qr.imagePath);
    setMode('cropping');
  }, [qr]);

  async function handleCropSave(croppedUri: string) {
    try {
      const saved = await messQrStore.saveFromUri(croppedUri);
      setQr(saved);
      setMode('viewing');
      setPendingImageUri(null);
    } catch (err) {
      Alert.alert('Could not save', friendlyErrorMessage(err));
    }
  }

  function handleCropCancel() {
    setPendingImageUri(null);
    setMode(qr ? 'viewing' : 'empty');
  }

  function confirmDelete() {
    Alert.alert('Remove your saved Mess QR?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await messQrStore.clear();
            setQr(null);
            setMode('empty');
          } catch {
            Alert.alert('Something went wrong', 'Could not remove your QR. Please try again.');
          }
        },
      },
    ]);
  }

  const headerShown = loading || mode === 'empty';

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown }} />
        <View style={[styles.container, { backgroundColor: theme.background }]} />
      </>
    );
  }

  if (mode === 'cropping' && pendingImageUri) {
    return (
      <>
        <Stack.Screen options={{ headerShown }} />
        <ImageCropEditor imageUri={pendingImageUri} onCancel={handleCropCancel} onSave={(uri) => void handleCropSave(uri)} />
      </>
    );
  }

  if (mode === 'viewing' && qr) {
    const aspectRatio = qr.width && qr.height ? qr.width / qr.height : 1;
    return (
      <>
        <Stack.Screen options={{ headerShown }} />
        {/* White, not black: scanners need the QR's light quiet zone, and a failed image is never just a black screen. */}
        <View style={styles.viewer} {...panResponder.panHandlers}>
          {imageStatus === 'error' ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={40} color={QR_INK} />
              <Text style={styles.errorTitle}>Couldn&apos;t show your QR</Text>
              <Text style={styles.errorBody}>
                The saved image could not be loaded. Replace it with a fresh photo or screenshot of your Mess QR.
              </Text>
            </View>
          ) : (
            <Animated.Image
              key={qr.imagePath}
              source={{ uri: qr.imagePath }}
              style={[styles.qrImage, { aspectRatio }]}
              resizeMode="contain"
              onLoad={() => setImageStatus('ok')}
              onError={() => setImageStatus('error')}
              accessibilityLabel="Mess QR code, full screen"
            />
          )}

          <Animated.View style={[styles.topRow, { top: insets.top + AppSpacing.sm }, overlayStyle]} pointerEvents="box-none">
            <Pressable onPress={openReCrop} hitSlop={12} style={styles.roundButton} accessibilityRole="button" accessibilityLabel="Edit QR">
              <Icon name="pencil" size={20} color={QR_INK} />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable
                onPress={() => setAutoBrightness(!autoBrightness)}
                hitSlop={12}
                style={[styles.roundButton, autoBrightness && styles.roundButtonActive]}
                accessibilityRole="switch"
                accessibilityState={{ checked: autoBrightness }}
                accessibilityLabel="Maximum brightness while showing the QR"
              >
                <Icon name={autoBrightness ? 'sunny' : 'sunny-outline'} size={20} color={QR_INK} />
              </Pressable>
              <Pressable onPress={goBack} hitSlop={12} style={styles.roundButton} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={22} color={QR_INK} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View style={[styles.bottomRow, { bottom: insets.bottom + AppSpacing.lg }, overlayStyle]} pointerEvents="box-none">
            <Pressable style={styles.bottomButton} onPress={() => void pickImage(false)} accessibilityRole="button" accessibilityLabel="Replace QR">
              <Text style={styles.bottomButtonText}>Replace QR</Text>
            </Pressable>
            <Pressable style={styles.bottomButton} onPress={confirmDelete} accessibilityRole="button" accessibilityLabel="Delete QR">
              <Text style={[styles.bottomButtonText, styles.deleteText]}>Delete QR</Text>
            </Pressable>
          </Animated.View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.qrFrame, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <EmptyState
          icon="qr-code-outline"
          title="No QR added"
          message="Add your institute-issued Mess QR code."
        />
      </View>
      <PrimaryButton label="Upload from Gallery" onPress={() => void pickImage(false)} />
      <SecondaryButton label="Take Photo" onPress={() => void pickImage(true)} />
      <SecondaryButton label="Cancel" onPress={goBack} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  qrFrame: {
    minHeight: 280,
    borderRadius: AppRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: QR_PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '86%',
    maxWidth: 420,
  },
  errorBox: {
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingHorizontal: AppSpacing.xl,
  },
  errorTitle: {
    ...AppTypography.h2,
    color: QR_INK,
    textAlign: 'center',
  },
  errorBody: {
    ...AppTypography.body,
    color: QR_INK_MUTED,
    textAlign: 'center',
  },
  topRow: {
    position: 'absolute',
    left: AppSpacing.lg,
    right: AppSpacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 5, 13, 0.06)',
  },
  roundButtonActive: {
    backgroundColor: RedesignColors.secondary,
  },
  bottomRow: {
    position: 'absolute',
    left: AppSpacing.lg,
    right: AppSpacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.md,
  },
  bottomButton: {
    paddingHorizontal: AppSpacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: AppRadius.full,
    backgroundColor: 'rgba(1, 5, 13, 0.06)',
  },
  bottomButtonText: {
    ...AppTypography.button,
    color: QR_INK,
  },
  deleteText: {
    color: '#B23A34',
  },
});
