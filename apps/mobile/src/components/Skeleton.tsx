import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius } from '@/theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** A single pulsing placeholder block — compose several for a skeleton layout. */
export function Skeleton({ width = '100%', height = 16, borderRadius = AppRadius.sm, style }: SkeletonProps) {
  const theme = useThemeColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.surfaceMuted, opacity },
        style,
      ]}
    />
  );
}

/** Placeholder mimicking a DiscoverCampaignCard while the feed is loading. */
export function DiscoverCardSkeleton() {
  const theme = useThemeColors();
  return (
    <View style={{ borderRadius: AppRadius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', backgroundColor: theme.surface }}>
      <Skeleton height={140} borderRadius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
      </View>
    </View>
  );
}
