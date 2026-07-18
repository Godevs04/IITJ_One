#!/usr/bin/env node
/**
 * EAS Build hook: materialize gitignored Firebase config files from secrets.
 *
 * Upload once (from apps/mobile):
 *   eas env:create --name GOOGLE_SERVICES_JSON --type file \
 *     --value ./google-services.json --environment production --visibility secret
 *   eas env:create --name GOOGLE_SERVICES_PLIST --type file \
 *     --value ./GoogleService-Info.plist --environment production --visibility secret
 *
 * During the build, those env vars point at temp files. We copy them to the
 * paths declared in app.json so prebuild / RNFirebase always find them.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isEas = process.env.EAS_BUILD === 'true';
const platform = process.env.EAS_BUILD_PLATFORM; // 'android' | 'ios'

function materialize(envKey, destName) {
  const src = process.env[envKey];
  const dest = path.join(root, destName);

  if (!src) {
    if (fs.existsSync(dest)) {
      console.log(`[eas-pre-install] Using checked-in/local ${destName}`);
      return true;
    }
    console.log(`[eas-pre-install] ${envKey} not set — ${destName} missing`);
    return false;
  }

  if (fs.existsSync(src) && fs.statSync(src).isFile()) {
    if (path.resolve(src) !== path.resolve(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`[eas-pre-install] Copied ${envKey} → ${destName}`);
    } else {
      console.log(`[eas-pre-install] ${destName} already in place`);
    }
    return true;
  }

  // Raw file contents pasted into a string secret
  if (typeof src === 'string' && src.trim().length > 0 && !src.startsWith('/')) {
    fs.writeFileSync(dest, src);
    console.log(`[eas-pre-install] Wrote ${destName} from ${envKey} string secret`);
    return true;
  }

  console.warn(`[eas-pre-install] ${envKey} set but not a readable file: ${src}`);
  return false;
}

const androidOk = materialize('GOOGLE_SERVICES_JSON', 'google-services.json');
const iosOk = materialize('GOOGLE_SERVICES_PLIST', 'GoogleService-Info.plist');

if (isEas) {
  if (platform === 'android' && !androidOk) {
    console.error(`
[eas-pre-install] google-services.json is required for Android builds.
It is gitignored, so upload an EAS file secret from apps/mobile:

  eas env:create --name GOOGLE_SERVICES_JSON --type file \\
    --value ./google-services.json --environment production --visibility secret

Then rebuild.
`);
    process.exit(1);
  }
  if (platform === 'ios' && !iosOk) {
    console.error(`
[eas-pre-install] GoogleService-Info.plist is required for iOS builds.
It is gitignored, so upload an EAS file secret from apps/mobile:

  eas env:create --name GOOGLE_SERVICES_PLIST --type file \\
    --value ./GoogleService-Info.plist --environment production --visibility secret

Then rebuild.
`);
    process.exit(1);
  }
}
