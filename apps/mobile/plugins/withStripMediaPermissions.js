/**
 * Strips broad photo/video storage permissions from the merged Android manifest.
 *
 * expo-screen-capture and expo-image-picker library manifests can inject
 * READ_MEDIA_* / READ_EXTERNAL_STORAGE even when the app uses the system
 * photo picker. blockedPermissions + this finalized patch guarantee the
 * permissions never appear in production AABs.
 *
 * List this plugin FIRST in app.json plugins (Expo applies last→first).
 */
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withFinalizedMod,
} = require('expo/config-plugins');

const STRIP_PERMISSIONS = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

function ensureToolsNamespace(manifest) {
  if (!manifest.$) manifest.$ = {};
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }
}

function ensureRemoveNodes(manifest) {
  ensureToolsNamespace(manifest);
  const existing = manifest['uses-permission'] ?? [];
  const list = Array.isArray(existing) ? existing : [existing];
  const byName = new Map();

  for (const item of list) {
    const name = item.$?.['android:name'];
    if (name) byName.set(name, item);
  }

  for (const permission of STRIP_PERMISSIONS) {
    const current = byName.get(permission) ?? { $: {} };
    current.$['android:name'] = permission;
    current.$['tools:node'] = 'remove';
    delete current.$['android:minSdkVersion'];
    delete current.$['android:maxSdkVersion'];
    byName.set(permission, current);
  }

  manifest['uses-permission'] = Array.from(byName.values());
  return manifest;
}

function patchManifestXml(xml) {
  let next = xml;
  if (!next.includes('xmlns:tools=')) {
    next = next.replace(
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"',
    );
  }

  for (const permission of STRIP_PERMISSIONS) {
    const shortName = permission.replace('android.permission.', '');
    // Remove any positive declaration (no tools:node="remove").
    const positive = new RegExp(
      `<uses-permission[^>]*android:name="${permission}"(?![^>]*tools:node="remove")[^>]*/>`,
      'g',
    );
    next = next.replace(positive, '');

    // Ensure a tools:node="remove" stub exists for the manifest merger.
    if (!next.includes(`android:name="${permission}"`)) {
      next = next.replace(
        '</manifest>',
        `  <uses-permission android:name="${permission}" tools:node="remove"/>\n</manifest>`,
      );
    } else {
      const pattern = new RegExp(
        `(<uses-permission[^>]*android:name="${permission}"[^>]*)(/?>)`,
        'g',
      );
      next = next.replace(pattern, (full, attrs, close) => {
        if (attrs.includes('tools:node=')) return full;
        return `${attrs} tools:node="remove"${close}`;
      });
    }
  }

  return next;
}

function withStripMediaPermissions(config) {
  config = AndroidConfig.Permissions.withBlockedPermissions(config, STRIP_PERMISSIONS);

  config = withAndroidManifest(config, (config) => {
    config.modResults.manifest = ensureRemoveNodes(config.modResults.manifest);
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
  withStripMediaPermissions,
  'withStripMediaPermissions',
  '1.0.0',
);
