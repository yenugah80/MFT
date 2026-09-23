/**
 * Release config guard
 *
 * Asserts the App Store / Play Store invariants that are easy to break silently
 * and expensive to discover — a rejected submission, or worse, a shipped build
 * that crashes or over-collects data.
 *
 * Every rule here corresponds to a real defect found in this repo, not a
 * hypothetical. Run via `npm run validate:release` (and in CI).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(MOBILE_ROOT, '..');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const app = readJson(path.join(MOBILE_ROOT, 'app.json')).expo;
const eas = readJson(path.join(MOBILE_ROOT, 'eas.json'));

const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/** True when a package resolves from either the workspace root or mobile/. */
const hasPackage = (name) =>
  fs.existsSync(path.join(REPO_ROOT, 'node_modules', name)) ||
  fs.existsSync(path.join(MOBILE_ROOT, 'node_modules', name));

const infoPlist = app.ios?.infoPlist ?? {};
const androidPermissions = app.android?.permissions ?? [];

// ─── Identity ────────────────────────────────────────────────────────────────

if (!app.ios?.bundleIdentifier) fail('app.json: ios.bundleIdentifier is missing');
if (!app.android?.package) fail('app.json: android.package is missing');
if (!app.version) fail('app.json: version is missing');

// ─── Export compliance ───────────────────────────────────────────────────────
// Without this key every upload prompts for export-compliance paperwork.

if (infoPlist.ITSAppUsesNonExemptEncryption === undefined) {
  fail('app.json: ios.infoPlist.ITSAppUsesNonExemptEncryption is missing — every build will prompt for export compliance');
}

// ─── Permissions must match actual capability ────────────────────────────────
// Declaring data access the app cannot perform invites rejection for
// over-collection. The HealthKit strings shipped for months against a stubbed
// integration with no native SDK installed.

const HEALTH_PACKAGES = ['react-native-health', 'react-native-health-connect'];
const healthSdkInstalled = HEALTH_PACKAGES.some(hasPackage);

const declaredHealthKeys = Object.keys(infoPlist).filter((k) => k.startsWith('NSHealth'));
const declaredHealthPerms = androidPermissions.filter((p) => p.includes('permission.health'));

if (!healthSdkInstalled) {
  if (declaredHealthKeys.length > 0) {
    fail(
      `app.json declares ${declaredHealthKeys.join(', ')} but no health SDK is installed ` +
        `(${HEALTH_PACKAGES.join(' / ')}). Remove the keys or install the SDK.`
    );
  }
  if (declaredHealthPerms.length > 0) {
    fail(
      `app.json declares ${declaredHealthPerms.length} android health permission(s) but no health SDK ` +
        `is installed. Remove them or install the SDK.`
    );
  }
}

// The inverse: capability present, permission string missing → runtime crash on
// first use, since iOS kills the app when a usage string is absent.
const USAGE_STRING_FOR = [
  { pkg: 'expo-camera', key: 'NSCameraUsageDescription' },
  { pkg: 'expo-image-picker', key: 'NSPhotoLibraryUsageDescription' },
  { pkg: '@react-native-voice/voice', key: 'NSMicrophoneUsageDescription' },
  { pkg: '@react-native-voice/voice', key: 'NSSpeechRecognitionUsageDescription' },
  { pkg: 'expo-local-authentication', key: 'NSFaceIDUsageDescription' },
];

for (const { pkg, key } of USAGE_STRING_FOR) {
  if (hasPackage(pkg) && !infoPlist[key]) {
    fail(`app.json: ${pkg} is installed but ios.infoPlist.${key} is missing — iOS terminates the app on first use`);
  }
}

// And the HealthKit lesson applied to Face ID: a usage string with no module
// behind it declares a capability the app cannot perform.
if (infoPlist.NSFaceIDUsageDescription && !hasPackage('expo-local-authentication')) {
  fail(
    'app.json declares NSFaceIDUsageDescription but expo-local-authentication is not installed. ' +
      'Remove the key or install the module.'
  );
}

// ─── A security control must actually be enforced ────────────────────────────
// The "Biometric lock" switch shipped for months writing a flag that nothing
// read: the module was absent and no code gated the app. A security setting
// that does nothing is worse than not offering one — it is both a trust problem
// and an App Review problem. Assert the whole enforcement path exists whenever
// the switch is offered.

const privacyScreenPath = path.join(MOBILE_ROOT, 'app', 'profile', 'privacy.jsx');
const rootLayoutPath = path.join(MOBILE_ROOT, 'app', '_layout.jsx');

if (fs.existsSync(privacyScreenPath) && fs.existsSync(rootLayoutPath)) {
  const privacyScreen = fs.readFileSync(privacyScreenPath, 'utf8');
  const rootLayout = fs.readFileSync(rootLayoutPath, 'utf8');

  const lockSwitchOffered = /useBiometricLock/.test(privacyScreen);
  const providerMounted = /<BiometricLockProvider[\s>]/.test(rootLayout);

  if (lockSwitchOffered && !hasPackage('expo-local-authentication')) {
    fail(
      'Privacy & Security offers the app-lock switch but expo-local-authentication is not installed — ' +
        'the control would do nothing.'
    );
  }

  if (lockSwitchOffered && !providerMounted) {
    fail(
      'Privacy & Security offers the app-lock switch but BiometricLockProvider is not mounted in ' +
        'app/_layout.jsx — nothing would gate the app.'
    );
  }
}

// ─── Privacy manifest ────────────────────────────────────────────────────────
// Missing required-reason declarations trigger ITMS-91053 emails after upload.

const declaredApis = (app.ios?.privacyManifests?.NSPrivacyAccessedAPITypes ?? []).map(
  (e) => e.NSPrivacyAccessedAPIType
);

const REQUIRED_APIS = [
  { api: 'NSPrivacyAccessedAPICategoryUserDefaults', because: '@react-native-async-storage/async-storage' },
  { api: 'NSPrivacyAccessedAPICategoryFileTimestamp', because: 'expo-file-system' },
  { api: 'NSPrivacyAccessedAPICategoryDiskSpace', because: 'expo-file-system' },
];

for (const { api, because } of REQUIRED_APIS) {
  if (!declaredApis.includes(api)) {
    warn(`app.json: privacy manifest is missing ${api} (expected for ${because}) — expect ITMS-91053 after upload`);
  }
}

for (const entry of app.ios?.privacyManifests?.NSPrivacyAccessedAPITypes ?? []) {
  if (!entry.NSPrivacyAccessedAPITypeReasons?.length) {
    fail(`app.json: privacy manifest entry ${entry.NSPrivacyAccessedAPIType} has no reason codes`);
  }
}

// ─── Theme declaration must match reality ────────────────────────────────────
// `userInterfaceStyle: "automatic"` tells iOS the app adapts to dark mode. If
// nothing can actually switch themes, native alerts, keyboards and share sheets
// render dark against a permanently light app. Only allow 'automatic' once a
// code path exists that can set a non-light theme mode.

// Why app.json pins userInterfaceStyle to "light" for 1.0: the dark theme
// (ThemeProvider + darkPremiumTheme) is fully built but unreachable — nothing
// calls setThemeMode, ThemeSettingsModal is never opened, and the provider
// defaults to LIGHT — so activeTheme is permanently 'light'. Declaring
// "automatic" made iOS draw native alerts, keyboards and share sheets dark
// against a light app. Flip both this default and app.json when a reachable
// theme selector ships.
//
// Checked against ThemeProvider's DEFAULT mode rather than the mere existence
// of switcher code: ThemeSettingsModal calls setThemeMode but is never opened,
// so "does a switcher exist?" answers yes while dark mode stays unreachable.
// The default is what actually determines what users see on first launch.

if (app.userInterfaceStyle === 'automatic' || app.userInterfaceStyle === 'dark') {
  const providerPath = path.join(MOBILE_ROOT, 'providers', 'ThemeProvider.jsx');

  if (fs.existsSync(providerPath)) {
    const provider = fs.readFileSync(providerPath, 'utf8');
    const defaultMode = provider.match(/useState\(\s*THEME_MODES\.(\w+)\s*\)/)?.[1];

    if (defaultMode === 'LIGHT') {
      fail(
        `app.json: userInterfaceStyle is "${app.userInterfaceStyle}" but ThemeProvider defaults to ` +
          'THEME_MODES.LIGHT, so the app always renders light. iOS would then draw native alerts, ' +
          'keyboards and share sheets dark against a light app. Use "light", or default the provider ' +
          'to AUTO once a reachable theme selector ships.'
      );
    }
  }
}

// ─── Submission config ───────────────────────────────────────────────────────

const iosSubmit = eas.submit?.production?.ios ?? {};
if (!iosSubmit.ascAppId) fail('eas.json: submit.production.ios.ascAppId is missing — `eas submit` cannot target the app');
if (!iosSubmit.appleTeamId) fail('eas.json: submit.production.ios.appleTeamId is missing');

const prodBuild = eas.build?.production ?? {};
if (!prodBuild.channel) fail('eas.json: build.production.channel is missing — OTA updates will not route');

// ─── Secret leak guard ───────────────────────────────────────────────────────
// Config files are committed; live secrets must never appear in them.

const SECRET_PATTERNS = [
  { re: /\bsk_live_[A-Za-z0-9]/, label: 'Clerk live secret key' },
  { re: /\bsk_test_[A-Za-z0-9]/, label: 'Clerk test secret key' },
  { re: /\bAIza[0-9A-Za-z_-]{20,}/, label: 'Google API key' },
];

for (const file of ['app.json', 'eas.json']) {
  const contents = fs.readFileSync(path.join(MOBILE_ROOT, file), 'utf8');
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(contents)) fail(`${file}: contains what looks like a ${label} — secrets must not be committed`);
  }
}

// A test Clerk key in a production build silently points the app at test data.
if (/\bpk_test_/.test(JSON.stringify(eas.build?.production ?? {}))) {
  fail('eas.json: build.production references a pk_test_ Clerk key — production must use pk_live_');
}

// ─── Report ──────────────────────────────────────────────────────────────────

for (const w of warnings) console.warn(`⚠️  ${w}`);

if (errors.length > 0) {
  console.error(`\n❌ Release config invalid (${errors.length} error${errors.length === 1 ? '' : 's'}):\n`);
  for (const e of errors) console.error(`   • ${e}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✅ Release config valid${warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})` : ''}`
);
