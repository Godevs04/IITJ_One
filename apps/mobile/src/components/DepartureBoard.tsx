import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { AppColors, AppTypography } from '@/theme/tokens';

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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.timeRow}>
        {showColon ? (
          <>
            <Text
              style={[
                large ? styles.timeLarge : styles.time,
                urgent && styles.urgent,
              ]}
            >
              {minutes}
            </Text>
            <Text
              style={[
                large ? styles.timeLarge : styles.time,
                urgent && styles.urgent,
                blink && !reduceMotion && !colonVisible && styles.hidden,
              ]}
            >
              :
            </Text>
            <Text
              style={[
                large ? styles.timeLarge : styles.time,
                urgent && styles.urgent,
              ]}
            >
              {seconds}
            </Text>
          </>
        ) : (
          <Text
            style={[
              large ? styles.timeLarge : styles.time,
              urgent && styles.urgent,
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
    color: AppColors.mutedText,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  time: {
    ...AppTypography.dataMono,
    color: AppColors.inkSlate,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  timeLarge: {
    ...AppTypography.dataLargeMono,
    color: AppColors.inkSlate,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  urgent: {
    color: AppColors.tharDusk,
  },
  hidden: {
    opacity: 0,
  },
});
