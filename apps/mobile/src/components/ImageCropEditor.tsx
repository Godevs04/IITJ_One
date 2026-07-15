import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const FRAME_RATIO = 0.82;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

function clampWorklet(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

interface ImageCropEditorProps {
  imageUri: string;
  onCancel: () => void;
  onSave: (croppedUri: string) => void;
}

export function ImageCropEditor({ imageUri, onCancel, onSave }: ImageCropEditorProps) {
  const theme = useThemeColors();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const frameSize = Math.min(screenWidth, screenHeight) * FRAME_RATIO;

  const [workingUri, setWorkingUri] = useState(imageUri);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      workingUri,
      (width, height) => {
        if (cancelled) return;
        setNaturalSize({ width, height });
        setError(null);
      },
      () => {
        if (cancelled) return;
        setError('Could not read this image. Try a different photo.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [workingUri]);

  const coverScale = naturalSize ? frameSize / Math.min(naturalSize.width, naturalSize.height) : 1;
  const baseWidth = naturalSize ? naturalSize.width * coverScale : frameSize;
  const baseHeight = naturalSize ? naturalSize.height * coverScale : frameSize;

  function resetPanZoom() {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clampWorklet(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      const maxX = Math.max(0, (baseWidth * scale.value - frameSize) / 2);
      const maxY = Math.max(0, (baseHeight * scale.value - frameSize) / 2);
      translateX.value = clampWorklet(translateX.value, -maxX, maxX);
      translateY.value = clampWorklet(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const maxX = Math.max(0, (baseWidth * scale.value - frameSize) / 2);
      const maxY = Math.max(0, (baseHeight * scale.value - frameSize) / 2);
      translateX.value = clampWorklet(savedTranslateX.value + e.translationX, -maxX, maxX);
      translateY.value = clampWorklet(savedTranslateY.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinch, pan);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  async function rotate() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(workingUri, [{ rotate: 90 }], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      setWorkingUri(result.uri);
      resetPanZoom();
    } catch {
      setError('Could not rotate this image.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!naturalSize || busy) return;
    setBusy(true);
    setError(null);
    try {
      const effectiveScale = coverScale * scale.value;
      const frameLeftFromImageCenter = baseWidth * scale.value / 2 - frameSize / 2 - translateX.value;
      const frameTopFromImageCenter = baseHeight * scale.value / 2 - frameSize / 2 - translateY.value;

      const originX = Math.max(0, frameLeftFromImageCenter / effectiveScale);
      const originY = Math.max(0, frameTopFromImageCenter / effectiveScale);
      const cropSize = frameSize / effectiveScale;

      const width = Math.min(cropSize, naturalSize.width - originX);
      const height = Math.min(cropSize, naturalSize.height - originY);

      const result = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      onSave(result.uri);
    } catch {
      setError('Could not crop this image. Please try again.');
      setBusy(false);
    }
  }

  const frameOffsetX = (screenWidth - frameSize) / 2;
  const frameOffsetY = (screenHeight - frameSize) / 2 - 40;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={12} disabled={busy}>
          <Text style={styles.headerText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Crop QR</Text>
        <Pressable onPress={() => void handleSave()} hitSlop={12} disabled={busy || !naturalSize}>
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.headerText, styles.saveText]}>Save</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.editorArea}>
        {naturalSize ? (
          <GestureDetector gesture={composedGesture}>
            <View
              style={[
                styles.clipFrame,
                { width: frameSize, height: frameSize, left: frameOffsetX, top: frameOffsetY },
              ]}
            >
              <Animated.Image
                source={{ uri: workingUri }}
                style={[
                  {
                    width: baseWidth,
                    height: baseHeight,
                    position: 'absolute',
                    left: (frameSize - baseWidth) / 2,
                    top: (frameSize - baseHeight) / 2,
                  },
                  animatedImageStyle,
                ]}
                resizeMode="cover"
              />
            </View>
          </GestureDetector>
        ) : (
          <ActivityIndicator color="#fff" style={{ top: frameOffsetY + frameSize / 2 }} />
        )}
        <View
          pointerEvents="none"
          style={[
            styles.frameBorder,
            { width: frameSize, height: frameSize, left: frameOffsetX, top: frameOffsetY },
          ]}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.toolButton, { backgroundColor: theme.surface }]}
          onPress={() => void rotate()}
          disabled={busy}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.text} />
          <Text style={[styles.toolLabel, { color: theme.text }]}>Rotate</Text>
        </Pressable>
        <Pressable
          style={[styles.toolButton, { backgroundColor: theme.surface }]}
          onPress={resetPanZoom}
          disabled={busy}
        >
          <Ionicons name="scan-outline" size={20} color={theme.text} />
          <Text style={[styles.toolLabel, { color: theme.text }]}>Reset Crop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: 56,
    paddingBottom: AppSpacing.md,
  },
  headerText: {
    ...AppTypography.button,
    color: '#fff',
  },
  headerTitle: {
    ...AppTypography.button,
    color: '#fff',
    fontWeight: '600',
  },
  saveText: {
    fontWeight: '700',
  },
  editorArea: {
    flex: 1,
    overflow: 'hidden',
  },
  clipFrame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  frameBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: AppRadius.sm,
  },
  errorText: {
    ...AppTypography.bodySmall,
    color: '#ff8080',
    textAlign: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.xl,
    paddingTop: AppSpacing.sm,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.full,
  },
  toolLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
});
