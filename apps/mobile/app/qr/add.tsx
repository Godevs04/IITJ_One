import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { goBack } from '@/navigation/goBack';
import { CAPTION_MAX_LENGTH, DEFAULT_CAPTION, QrSaveError, qrCollection } from '@/qr/qrCollection';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

/**
 * Screens 05 and 06 as one popup: choose a source (gallery or camera), then preview, caption and save.
 * Nothing is stored until SAVE QR succeeds, so closing at any point leaves the collection untouched.
 */
export default function AddQrModal() {
  const theme = useThemeColors();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensurePermission = async (useCamera: boolean): Promise<boolean> => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;
    Alert.alert(
      useCamera ? 'Camera access needed' : 'Photo access needed',
      useCamera ? 'Allow camera access in Settings to take a photo of your QR.' : 'Allow photo access in Settings to choose a QR.',
      permission.canAskAgain ? [{ text: 'OK' }] : [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }],
    );
    return false;
  };

  const pick = async (useCamera: boolean) => {
    setError(null);
    if (!(await ensurePermission(useCamera))) return;
    try {
      // quality 1 and no editing: re-compressing or cropping a QR can make it unreadable.
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
      // Cancelling is not an error — stay where we were.
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    } catch {
      setError(useCamera ? 'The camera is not available on this device.' : 'Could not open your photos. Please try again.');
    }
  };

  const save = async () => {
    if (!imageUri || saving) return;
    setSaving(true);
    setError(null);
    try {
      await qrCollection.add(imageUri, caption);
      goBack();
    } catch (e) {
      setError(e instanceof QrSaveError ? e.message : 'Could not save the QR. Please try again.');
      setSaving(false);
    }
  };

  const Primary = ({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: disabled ? 0.5 : 1 }, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{label}</Text>}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
      <Pressable style={StyleSheet.absoluteFill} onPress={goBack} accessibilityLabel="Close" />
      <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.close}
        >
          <MaterialIcons name="close" size={24} color={theme.text} />
        </Pressable>

        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.preview} accessibilityLabel="Selected QR image" />
            {/* The image is only on this device until SAVE QR succeeds, so it is "selected", not "uploaded". */}
            <View style={styles.status}>
              <Text style={[styles.statusText, { color: theme.text }]}>IMAGE SELECTED</Text>
              <MaterialIcons name="check-circle" size={18} color={theme.veg} />
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor={theme.textMuted}
              maxLength={CAPTION_MAX_LENGTH}
              accessibilityLabel={`Caption, optional. Saved as ${DEFAULT_CAPTION} if left blank`}
              returnKeyType="done"
              style={[styles.caption, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            />
            {error ? <Text style={[styles.error, { color: theme.error }]} accessibilityLiveRegion="polite">{error}</Text> : null}
            <Primary label="SAVE QR" onPress={() => void save()} disabled={saving} busy={saving} />
            <Pressable onPress={() => setImageUri(null)} disabled={saving} accessibilityRole="button" style={styles.textAction}>
              <Text style={[styles.textActionLabel, { color: theme.linkText }]}>Choose a different image</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no">
              <MaterialIcons name="qr-code-scanner" size={96} color={theme.text} />
              <View style={[styles.plus, { backgroundColor: theme.highlight, borderColor: theme.surfaceRaised }]}>
                <MaterialIcons name="add" size={22} color={theme.onHighlight} />
              </View>
            </View>
            {error ? <Text style={[styles.error, { color: theme.error }]} accessibilityLiveRegion="polite">{error}</Text> : null}
            <Primary label="UPLOAD FROM GALLERY" onPress={() => void pick(false)} />
            <Primary label="TAKE PHOTO" onPress={() => void pick(true)} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screenMargin,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    borderRadius: AppRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  close: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  glyph: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  plus: {
    position: 'absolute',
    right: -8,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    alignSelf: 'center',
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.md,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  caption: {
    ...AppTypography.body,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: spacing.md,
  },
  button: {
    minHeight: 52,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...AppTypography.button,
    letterSpacing: 1,
  },
  textAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textActionLabel: {
    ...AppTypography.bodyHeader,
  },
  error: {
    ...AppTypography.bodySmall,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
