import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { getMessQR, saveMessQRFromUri, clearMessQR } from '@/services/qrStorage';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

/**
 * Mess QR — local only, never synced to any server.
 */
export default function MessQrScreen() {
  const [qr, setQr] = useState(getMessQR());
  const [displayMode, setDisplayMode] = useState(false);

  const refresh = () => setQr(getMessQR());

  const importImage = useCallback(async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });

    if (!result.canceled && result.assets[0]) {
      await saveMessQRFromUri(result.assets[0].uri);
      refresh();
      setDisplayMode(true);
    }
  }, []);

  useEffect(() => {
    if (!displayMode || !qr) return undefined;

    void activateKeepAwakeAsync('mess-qr');
    void Brightness.setBrightnessAsync(1);

    return () => {
      deactivateKeepAwake('mess-qr');
      void Brightness.restoreSystemBrightnessAsync();
      setDisplayMode(false);
    };
  }, [displayMode, qr]);

  if (displayMode && qr) {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.fullHeader}>
          <Pressable onPress={() => setDisplayMode(false)} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Pressable onPress={() => void importImage(false)}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
        <Image source={{ uri: qr.imagePath }} style={styles.qrImage} resizeMode="contain" />
        <Text style={styles.caption}>Mess QR</Text>
      </View>
    );
  }

  if (qr) {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setDisplayMode(true)} style={styles.qrPreview}>
          <Image source={{ uri: qr.imagePath }} style={styles.previewImage} resizeMode="contain" />
        </Pressable>
        <Text style={styles.hint}>Tap to open full-screen display for scanning</Text>
        <PrimaryButton label="Open display" onPress={() => setDisplayMode(true)} />
        <SecondaryButton label="Replace image" onPress={() => void importImage(false)} />
        <SecondaryButton
          label="Remove QR"
          onPress={async () => {
            await clearMessQR();
            refresh();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.qrFrame}>
        <EmptyState
          icon="qr-code-outline"
          title="No QR saved yet"
          message="Import from gallery or scan with camera."
        />
      </View>
      <PrimaryButton label="Import from gallery" onPress={() => void importImage(false)} />
      <SecondaryButton label="Scan with camera" onPress={() => void importImage(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.desertSand,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  qrFrame: {
    minHeight: 280,
    borderRadius: AppRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: AppColors.borderNeutral,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPreview: {
    minHeight: 240,
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    padding: AppSpacing.lg,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  hint: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
    textAlign: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppSpacing.lg,
  },
  fullHeader: {
    position: 'absolute',
    top: 56,
    left: AppSpacing.lg,
    right: AppSpacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeText: {
    fontSize: 24,
    color: AppColors.jodhpurIndigo,
  },
  editText: {
    ...AppTypography.button,
    color: AppColors.jodhpurIndigo,
  },
  qrImage: {
    width: '70%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: AppColors.jodhpurIndigo,
  },
  caption: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
    marginTop: AppSpacing.md,
  },
});
