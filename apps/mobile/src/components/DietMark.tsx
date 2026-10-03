import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';

/**
 * The FSSAI-style food mark every Indian student already reads at a glance:
 * a square outline with a filled circle (veg) or triangle (non-veg). Shape,
 * not just colour, so it still works for colour-blind users and in dark mode.
 */
export function DietMark({ type, size = 14 }: { type: 'veg' | 'nonVeg'; size?: number }) {
  const theme = useThemeColors();
  const color = type === 'veg' ? theme.veg : theme.nonVeg;
  const inner = Math.round(size * 0.5);

  return (
    <View
      style={[styles.box, { width: size, height: size, borderColor: color, borderRadius: Math.max(2, size * 0.15) }]}
      accessibilityLabel={type === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
    >
      {type === 'veg' ? (
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: color }} />
      ) : (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: inner / 2 + 0.5,
            borderRightWidth: inner / 2 + 0.5,
            borderBottomWidth: inner,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
