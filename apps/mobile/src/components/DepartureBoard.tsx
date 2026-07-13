import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppTypography } from '@/theme/tokens';

interface DepartureBoardProps {
  label: string;
  totalSeconds: number;
  blink?: boolean;
  large?: boolean;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function DepartureBoard({
  label,
  totalSeconds,
  blink = false,
  large = false,
}: DepartureBoardProps) {
  const theme = useThemeColors();
  const [colonVisible, setColonVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!blink || reduceMotion) return undefined;

    const timer = setInterval(() => {
      setColonVisible((value) => !value);
    }, 500);

    return () => clearInterval(timer);
  }, [blink, reduceMotion]);

  const urgent = totalSeconds < 600;
  const display = formatCountdown(totalSeconds);
  const showColon = display.includes(':');
  const [minutes, seconds] = showColon ? display.split(':') : [display, ''];
  const timeColor = urgent ? theme.countdownUrgent : theme.countdown;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <View style={styles.timeRow}>
        {showColon ? (
          <>
            <Text
              style={[
                large ? styles.timeLarge : styles.time,
                { color: timeColor },
              ]}
            >
              {minutes}
            </Text>
            <Text
              style={[
                large ? styles.timeLarge : styles.time,
                { color: timeColor },
                blink && !reduceMotion && !colonVisible && styles.hidden,
              ]}
            >
              :
            </Text>
            <Text
              style={[
                large ? styles.timeLarge : styles.time,
                { color: timeColor },
              ]}
            >
              {seconds}
            </Text>
          </>
        ) : (
          <Text
            style={[
              large ? styles.timeLarge : styles.time,
              { color: timeColor },
            ]}
          >
            {display}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    ...AppTypography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  time: {
    ...AppTypography.dataMono,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  timeLarge: {
    ...AppTypography.dataLargeMono,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  hidden: {
    opacity: 0,
  },
});
