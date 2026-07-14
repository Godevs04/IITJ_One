import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { messQrStore, MessQrStorageError, type MessQR } from '@/services/qrStorage';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

type Mode = 'empty' | 'cropping' | 'viewing';

const FADE_DELAY_MS = 3000;

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
  const [qr, setQr] = useState<MessQR | null>(null);
  const [mode, setMode] = useState<Mode>('empty');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const controlsOpacity = useSharedValue(1);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void messQrStore.get().then((value) => {
      if (!active) return;
      setQr(value);
      setMode(value ? 'viewing' : 'empty');
      setLoading(false);
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

  const initialBrightness = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== 'viewing') return undefined;

    revealControls();
    void activateKeepAwakeAsync('mess-qr');
    
    void Brightness.getBrightnessAsync().then((val) => {
      initialBrightness.current = val;
      void Brightness.setBrightnessAsync(1);
    }).catch(() => {
      void Brightness.setBrightnessAsync(1);
    });

    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      deactivateKeepAwake('mess-qr');
      if (initialBrightness.current !== null) {
        void Brightness.setBrightnessAsync(initialBrightness.current);
      } else {
        void Brightness.restoreSystemBrightnessAsync();
      }
    };
  }, [mode, revealControls]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  async function requestPermissionOrPrompt(useCamera: boolean): Promise<boolean> {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        useCamera
          ? 'Enable camera access in your device settings to take a photo of your QR.'
          : 'Enable photo library access in your device settings to import your QR.',
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
  }, []);

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
        <Pressable style={styles.viewer} onPress={revealControls}>
          <Animated.Image
            source={{ uri: qr.imagePath }}
            style={[styles.qrImage, { aspectRatio }]}
            resizeMode="contain"
            accessibilityLabel="Mess QR code, full screen"
          />

          <Animated.View style={[styles.topRow, overlayStyle]} pointerEvents="box-none">
            <Pressable onPress={openReCrop} hitSlop={16} accessibilityRole="button" accessibilityLabel="Edit QR">
              <Ionicons name="pencil" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => router.back()} hitSlop={16} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.bottomRow, overlayStyle]} pointerEvents="box-none">
            <Pressable
              style={styles.bottomButton}
              onPress={() => void pickImage(false)}
              accessibilityRole="button"
              accessibilityLabel="Replace QR"
            >
              <Text style={styles.bottomButtonText}>Replace QR</Text>
            </Pressable>
            <Pressable
              style={styles.bottomButton}
              onPress={confirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete QR"
            >
              <Text style={[styles.bottomButtonText, styles.deleteText]}>Delete QR</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
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
      <SecondaryButton label="Cancel" onPress={() => router.back()} />
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
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '82%',
  },
  topRow: {
    position: 'absolute',
    top: 56,
    left: AppSpacing.lg,
    right: AppSpacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    position: 'absolute',
    bottom: 48,
    left: AppSpacing.lg,
    right: AppSpacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.lg,
  },
  bottomButton: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bottomButtonText: {
    ...AppTypography.button,
    color: '#fff',
    fontWeight: '600',
  },
  deleteText: {
    color: '#ff8080',
  },
});
