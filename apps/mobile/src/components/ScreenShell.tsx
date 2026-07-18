import { ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  /** Manually override top safe area inclusion. Auto-detects based on header presence if undefined. */
  safeAreaTop?: boolean;
  /** Custom element to render on the right of the title */
  headerRight?: ReactNode;
  /** Shows a dismissible-by-retry banner when the last sync failed — pass through `useCampusSync().error`. */
  error?: string | null;
}

export function ScreenShell({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  hideTitle = false,
  safeAreaTop,
  headerRight,
  error,
}: ScreenShellProps) {
  const theme = useThemeColors();
  const segments = useSegments();

  // Determine if this is one of the tab screens with hidden navigation headers
  const isHeaderHiddenTab =
    segments[0] === '(tabs)' &&
    (segments[1] === 'menu' ||
      segments[1] === 'notices' ||
      segments[1] === 'transport' ||
      segments[1] === 'more');

  // Include top edge if header is hidden, or if explicitly requested via prop
  const applyTopInset = safeAreaTop ?? isHeaderHiddenTab;
  const edges: ('left' | 'right' | 'top')[] = ['left', 'right'];
  if (applyTopInset) {
    edges.push('top');
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={edges}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {headerRight !== undefined ? (
                headerRight
              ) : isHeaderHiddenTab ? (
                <Pressable
                  onPress={() => router.push('/search')}
                  hitSlop={10}
                  style={styles.searchButton}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                >
                  <Ionicons name="search-outline" size={24} color={theme.text} />
                </Pressable>
              ) : null}
            </View>
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
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.errorTint, borderColor: theme.error }]}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>
              Sync issue: {error}
            </Text>
          </View>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchButton: {
    padding: 4,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    borderWidth: 1,
    borderRadius: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  errorText: {
    ...AppTypography.caption,
    flex: 1,
  },
});
