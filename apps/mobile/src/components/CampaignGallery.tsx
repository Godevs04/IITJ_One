import { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing } from '@/theme/tokens';

interface CampaignGalleryProps {
  images: string[];
  themeColor?: string;
  height?: number;
}

/** Swipeable Cloudinary image gallery with dot indicators — falls back to a single static image when there's only one. */
export function CampaignGallery({ images, themeColor, height = 240 }: CampaignGalleryProps) {
  const theme = useThemeColors();
  const [index, setIndex] = useState(0);
  const width = Dimensions.get('window').width;

  if (images.length === 0) return null;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  return (
    <View style={[styles.wrap, { backgroundColor: themeColor || theme.surfaceMuted }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {images.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={{ width, height }}
            resizeMode="cover"
            accessibilityLabel={images.length > 1 ? `Campaign photo ${i + 1} of ${images.length}` : 'Campaign photo'}
          />
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View style={styles.dots} accessible accessibilityLabel={`Image ${index + 1} of ${images.length}`}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? theme.onPrimary : 'rgba(255,255,255,0.5)' },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  dots: {
    position: 'absolute',
    bottom: AppSpacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
