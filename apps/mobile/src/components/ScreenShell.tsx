import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppColors,
  AppSpacing,
  AppTypography,
  getThemeColors,
} from '@/theme/tokens';
import { useAppColorScheme } from '@/theme/ThemeProvider';

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ScreenShell({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
}: ScreenShellProps) {
  const scheme = useAppColorScheme();
  const theme = getThemeColors(scheme);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.desertSand,
  },
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  header: {
    gap: AppSpacing.xs,
  },
  title: {
    ...AppTypography.display,
    color: AppColors.inkSlate,
  },
  subtitle: {
    ...AppTypography.body,
    color: AppColors.mutedText,
  },
});
