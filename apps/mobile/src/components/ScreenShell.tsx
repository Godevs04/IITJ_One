import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';

interface ScreenShellProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Hide in-content title when stack header already shows it */
  hideTitle?: boolean;
}

export function ScreenShell({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  hideTitle = false,
}: ScreenShellProps) {
  const theme = useThemeColors();

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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          ) : undefined
        }
      >
        {!hideTitle && title ? (
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : subtitle ? (
          <Text style={[styles.subtitleOnly, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
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
  },
  subtitle: {
    ...AppTypography.body,
  },
  subtitleOnly: {
    ...AppTypography.body,
    marginBottom: AppSpacing.xs,
  },
});
