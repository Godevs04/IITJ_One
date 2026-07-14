import { useCallback } from 'react';
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

  // Filter out disabled apps and sort by displayOrder ASC
  const apps = (appsDoc?.apps ?? [])
    .filter((app) => app.isEnabled !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  // Smart launch flow: try deep link first, then fall back to platform app store, then website
  const handleLaunchApp = async (app: CampusApp) => {
    if (app.deepLink) {
      const canOpen = await Linking.canOpenURL(app.deepLink);
      if (canOpen) {
        void Linking.openURL(app.deepLink);
        return;
      }
    }

    const storeUrl = Platform.OS === 'ios' ? app.iosUrl : app.androidUrl;
    if (storeUrl) {
      void Linking.openURL(storeUrl);
    } else if (app.website) {
      void Linking.openURL(app.website);
    }
  };

  // Open maps using lat/long if available, fall back to plusCode, and fallback to name/address query
  const handleOpenInMaps = async (app: CampusApp) => {
    const hasCoords = typeof app.latitude === 'number' && typeof app.longitude === 'number' && app.latitude !== 0;
    const label = encodeURIComponent(app.locationName || app.name);

    if (hasCoords) {
      const latLng = `${app.latitude},${app.longitude}`;
      const googleMapsUrl = `comgooglemaps://?q=${latLng}&query=${label}`;
      const googleMapsWebUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;

      if (Platform.OS === 'ios') {
        const canOpenGoogle = await Linking.canOpenURL('comgooglemaps://');
        if (canOpenGoogle) {
          void Linking.openURL(googleMapsUrl);
          return;
        }
        // Fallback to default Apple Maps
        void Linking.openURL(`maps://0,0?q=${label}@${latLng}`);
      } else {
        // Android: try geo URI, fall back to Web URL
        const geoUrl = `geo:0,0?q=${latLng}(${label})`;
        const canOpenGeo = await Linking.canOpenURL(geoUrl);
        if (canOpenGeo) {
          void Linking.openURL(geoUrl);
        } else {
          void Linking.openURL(googleMapsWebUrl);
        }
      }
    } else if (app.plusCode) {
      const query = encodeURIComponent(app.plusCode);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      void Linking.openURL(url);
    } else {
      const query = encodeURIComponent(app.address || app.locationName || app.name);
      const url = Platform.select({
        ios: `maps://0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
      });
      if (url) void Linking.openURL(url);
    }
  };

  // Resolve logo source: temporarily hardcode Isthara & Cravee to bundled assets, otherwise support remote URLs or placeholders
  const getLogoSource = (name: string, logo: string) => {
    if (name.toLowerCase() === 'isthara') {
      return require('../assets/isthara.png');
    }
    if (name.toLowerCase() === 'cravee') {
      return require('../assets/cravee.webp');
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
            const logoSrc = getLogoSource(app.name, app.logo);
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

                {app.locationName ? (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={16} color={theme.textMuted} />
                    <Text style={[styles.locationText, { color: theme.textMuted }]}>
                      {app.locationName}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.buttonRow}>
                  {app.website ? (
                    <Pressable
                      onPress={() => Linking.openURL(app.website!)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: theme.surfaceMuted },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="globe-outline" size={16} color={theme.text} />
                      <Text style={[styles.actionButtonText, { color: theme.text }]}>
                        Visit Website
                      </Text>
                    </Pressable>
                  ) : app.locationName || app.plusCode ? (
                    <Pressable
                      onPress={() => handleOpenInMaps(app)}
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
                  ) : null}

                  <Pressable
                    onPress={() => handleLaunchApp(app)}
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
