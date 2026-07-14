import { useCallback, useState } from 'react';
import { Linking, Platform, View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { AppsDoc, CampusApp } from '@/types/campus';
import { AppSpacing, AppRadius, AppTypography } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeProvider';

export default function AppsScreen() {
  const { syncing, sync } = useCampusSync(false);
  const theme = useThemeColors();
  const appsDoc = useCampusModule<AppsDoc>('apps');
  const apps = (appsDoc?.apps ?? [])
    .filter((app) => app.isEnabled !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  const openStore = (app: CampusApp) => {
    const url = Platform.OS === 'ios' ? app.iosUrl : app.androidUrl;
    if (url) void Linking.openURL(url);
  };

  const openInMaps = (app: CampusApp) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${app.latitude},${app.longitude}`;
    const label = encodeURIComponent(app.locationName);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) void Linking.openURL(url);
  };

  const getLogoSource = (logo: string) => {
    if (logo === 'isthara.png') {
      return require('../assets/isthara.png');
    }
    if (logo && (logo.startsWith('http://') || logo.startsWith('https://'))) {
      return { uri: logo };
    }
    return null;
  };

  return (
    <ScreenShell
      title="Campus Apps"
      subtitle="Useful apps for IITJ"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {apps.length > 0 ? (
        <View style={{ gap: AppSpacing.md }}>
          {apps.map((app) => {
            const logoSrc = getLogoSource(app.logo);
            return (
              <View
                key={app.name}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.logoContainer, { backgroundColor: theme.surfaceMuted }]}>
                    {logoSrc ? (
                      <Image source={logoSrc} style={styles.logoImage} />
                    ) : (
                      <Ionicons name="apps-outline" size={28} color={theme.textMuted} />
                    )}
                  </View>
                  <View style={styles.headerText}>
                    <Text style={[styles.appName, { color: theme.text }]}>
                      {app.name}
                    </Text>
                    {app.category ? (
                      <View style={[styles.badge, { backgroundColor: theme.primaryTint }]}>
                        <Text style={[styles.badgeText, { color: theme.primary }]}>
                          {app.category}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Text style={[styles.description, { color: theme.textMuted }]}>
                  {app.description}
                </Text>

                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={16} color={theme.textMuted} />
                  <Text style={[styles.locationText, { color: theme.textMuted }]}>
                    {app.locationName}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <Pressable
                    onPress={() => openInMaps(app)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.surfaceMuted },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="map-outline" size={16} color={theme.text} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>
                      Open in Maps
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openStore(app)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
                      size={16}
                      color={theme.surface}
                    />
                    <Text style={[styles.actionButtonText, { color: theme.surface }]}>
                      Install / Open
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="apps-outline"
          title="No apps listed"
          message="Pull down to sync the campus apps directory."
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  appName: {
    ...AppTypography.h2,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
  },
  badgeText: {
    ...AppTypography.caption,
    fontWeight: '600',
  },
  description: {
    ...AppTypography.body,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  locationText: {
    ...AppTypography.bodySmall,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    paddingVertical: 10,
    borderRadius: AppRadius.md,
  },
  actionButtonText: {
    ...AppTypography.button,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
