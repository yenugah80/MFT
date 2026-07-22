/**
 * Expo Config Plugin: Android Manifest Merger Conflict Fixes
 *
 * android/ is gitignored (Continuous Native Generation) — these can't be
 * fixed by editing a generated file directly, they have to be applied as a
 * config plugin that patches the manifest on every prebuild.
 *
 * Fix 1 — notification color:
 * expo-notifications and @react-native-firebase/messaging both inject a
 * <meta-data android:name="com.google.firebase.messaging.default_notification_color">
 * with different values (expo-notifications uses the app's configured color;
 * react-native-firebase_messaging defaults to white). Gradle:
 *   "Attribute meta-data#com.google.firebase.messaging.default_notification_color
 *    ... is also present at [:react-native-firebase_messaging] ... Suggestion:
 *    add 'tools:replace="android:resource"' to <meta-data> element to override."
 *
 * Order-independent by design: rather than finding an element that
 * expo-notifications' own withAndroidManifest mod is expected to have already
 * added (unreliable — confirmed empirically that plugin array order in
 * app.json does NOT guarantee withAndroidManifest execution order across
 * plugins here), this uses the same addMetaDataItemToMainApplication utility
 * expo-notifications itself uses to ensure the element exists with the right
 * value, then adds tools:replace to it. addMetaDataItemToMainApplication only
 * ever touches the resource/value attribute on an existing match (see
 * @expo/config-plugins/build/android/Manifest.js) — it never touches other
 * attributes — so this is safe regardless of when it runs relative to
 * expo-notifications' own mod.
 *
 * Fix 2 — appComponentFactory:
 * Some dependency still pulls in the legacy com.android.support:support-compat
 * library alongside AndroidX (androidx.core), and both declare
 * application@appComponentFactory with different values. Gradle:
 *   "Attribute application@appComponentFactory ... is also present at
 *    [com.android.support:support-compat:28.0.0] ... Suggestion: add
 *    'tools:replace="android:appComponentFactory"' to <application> element."
 * This is a straight attribute set on <application> — no ordering concerns.
 */

const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const NOTIFICATION_COLOR_META_DATA_NAME = 'com.google.firebase.messaging.default_notification_color';
const NOTIFICATION_ICON_COLOR_RESOURCE = '@color/notification_icon_color';
const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

function withAndroidManifestMergerFixes(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = TOOLS_NAMESPACE;
    }

    // Fix 1 — notification color
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      NOTIFICATION_COLOR_META_DATA_NAME,
      NOTIFICATION_ICON_COLOR_RESOURCE,
      'resource'
    );
    const notificationColorMetaData = mainApplication['meta-data'].find(
      (item) => item.$['android:name'] === NOTIFICATION_COLOR_META_DATA_NAME
    );
    notificationColorMetaData.$['tools:replace'] = 'android:resource';
    console.log(`[withAndroidManifestMergerFixes] Ensured tools:replace on ${NOTIFICATION_COLOR_META_DATA_NAME}`);

    // Fix 2 — appComponentFactory
    const existingReplace = mainApplication.$['tools:replace'];
    const replaceAttrs = new Set(
      existingReplace ? existingReplace.split(',').map((s) => s.trim()) : []
    );
    replaceAttrs.add('android:appComponentFactory');
    mainApplication.$['tools:replace'] = Array.from(replaceAttrs).join(',');
    console.log('[withAndroidManifestMergerFixes] Ensured tools:replace on application@appComponentFactory');

    return config;
  });
}

module.exports = withAndroidManifestMergerFixes;
