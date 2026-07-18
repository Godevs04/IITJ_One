const fs = require('fs');
const path = require('path');

/**
 * Dynamic Expo config overlay on top of app.json.
 *
 * Profiles (set via EAS `env.APP_VARIANT` or locally):
 *   - development → "IITJ One (Dev)", optional .dev bundle id suffix
 *   - preview     → production identity, staging/prod API via EAS env
 *   - production  → store identity
 *
 * Google services files are only attached when present on disk so config
 * validation / lint still pass in CI or fresh clones without secrets.
 *
 * IMPORTANT: always return an object that spreads `config` so Expo's
 * internal "static config was used" Symbol is preserved (expo-doctor).
 */

const VARIANT =
  process.env.APP_VARIANT ||
  process.env.EAS_BUILD_PROFILE ||
  'development';

const IS_DEV = VARIANT === 'development';
const IS_PROD = VARIANT === 'production';

const PROJECT_ROOT = __dirname;

function resolveAsset(relativePath) {
  const absolute = path.join(PROJECT_ROOT, relativePath);
  return fs.existsSync(absolute) ? relativePath : undefined;
}

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => {
  const androidGoogleServices = resolveAsset('google-services.json');
  const iosGoogleServices = resolveAsset('GoogleService-Info.plist');

  const name = IS_DEV ? 'IITJ One (Dev)' : 'IITJ One';
  // Keep the same store identifiers unless APP_VARIANT=development AND
  // EXPO_PUBLIC_DEV_BUNDLE_SUFFIX=1 — avoids needing a second Firebase app
  // for day-to-day Expo Go / shared-device testing.
  const useDevBundle =
    IS_DEV && process.env.EXPO_PUBLIC_DEV_BUNDLE_SUFFIX === '1';
  const bundleIdentifier = useDevBundle ? 'app.iitjone.dev' : 'app.iitjone';
  const androidPackage = useDevBundle ? 'app.iitjone.dev' : 'app.iitjone';

  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (IS_PROD || VARIANT === 'preview'
      ? 'https://api.iitjone.app/api/v1'
      : undefined);

  const next = {
    ...config,
    name,
    ios: {
      ...config.ios,
      bundleIdentifier,
    },
    android: {
      ...config.android,
      package: androidPackage,
    },
    extra: {
      ...config.extra,
      appVariant: VARIANT,
      campusId: process.env.EXPO_PUBLIC_CAMPUS_ID || 'iitj',
      posthogHost: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
      eas: {
        ...(config.extra?.eas ?? {}),
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
          config.extra?.eas?.projectId ||
          'c307eca8-e310-4cfa-aca6-8c06b8fcd39f',
      },
    },
  };

  if (apiUrl) {
    next.extra.apiUrl = apiUrl;
  }

  if (process.env.POSTHOG_PROJECT_TOKEN) {
    next.extra.posthogProjectToken = process.env.POSTHOG_PROJECT_TOKEN;
  }

  if (iosGoogleServices) {
    next.ios.googleServicesFile = iosGoogleServices;
  } else {
    delete next.ios.googleServicesFile;
  }

  if (androidGoogleServices) {
    next.android.googleServicesFile = androidGoogleServices;
  } else {
    delete next.android.googleServicesFile;
  }

  return next;
};
