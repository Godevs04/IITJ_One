/**
 * Resolves Android manifest merger conflicts between expo-notifications and
 * @react-native-firebase/messaging for:
 *   - com.google.firebase.messaging.default_notification_channel_id
 *   - com.google.firebase.messaging.default_notification_color
 *
 * Expo applies plugins last→first, so the first plugin in `plugins` has the
 * final say on withAndroidManifest. List this plugin BEFORE expo-notifications.
 * withFinalizedMod also patches the written file as a safety net.
 */
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withFinalizedMod,
} = require('expo/config-plugins');

const CHANNEL_ID =
  'com.google.firebase.messaging.default_notification_channel_id';
const NOTIFICATION_COLOR =
  'com.google.firebase.messaging.default_notification_color';

function ensureToolsNamespace(manifest) {
  if (!manifest.$) manifest.$ = {};
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }
}

function asMetaDataArray(application) {
  const raw = application['meta-data'];
  if (!raw) {
    application['meta-data'] = [];
  } else if (!Array.isArray(raw)) {
    application['meta-data'] = [raw];
  }
  return application['meta-data'];
}

function applyToolsReplace(application) {
  const metaData = asMetaDataArray(application);
  for (const item of metaData) {
    const name = item.$?.['android:name'];
    if (name === CHANNEL_ID) {
      item.$['tools:replace'] = 'android:value';
    }
    if (name === NOTIFICATION_COLOR) {
      item.$['tools:replace'] = 'android:resource';
    }
  }
}

function patchManifestXml(xml) {
  let next = xml;
  if (!next.includes('xmlns:tools=')) {
    next = next.replace(
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"',
    );
  }
  for (const [name, replaceAttr] of [
    [CHANNEL_ID, 'android:value'],
    [NOTIFICATION_COLOR, 'android:resource'],
  ]) {
    const pattern = new RegExp(
      `<meta-data([^>]*android:name="${name}"[^>]*)/>`,
      'g',
    );
    next = next.replace(pattern, (full, attrs) => {
      if (attrs.includes('tools:replace=')) return full;
      return `<meta-data${attrs} tools:replace="${replaceAttr}"/>`;
    });
  }
  return next;
}

function withFirebaseMessagingManifestFix(config) {
  config = withAndroidManifest(config, (config) => {
    ensureToolsNamespace(config.modResults.manifest);
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    applyToolsReplace(application);
    return config;
  });

  return withFinalizedMod(config, [
    'android',
    async (config) => {
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/AndroidManifest.xml',
      );
      if (!fs.existsSync(manifestPath)) {
        return config;
      }
      const xml = fs.readFileSync(manifestPath, 'utf8');
      const patched = patchManifestXml(xml);
      if (patched !== xml) {
        fs.writeFileSync(manifestPath, patched);
      }
      return config;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withFirebaseMessagingManifestFix,
  'withFirebaseMessagingManifestFix',
  '1.2.0',
);
