/**
 * Expo Config Plugin: Notification Color Manifest Merger Fix
 *
 * expo-notifications and @react-native-firebase/messaging both inject a
 * <meta-data android:name="com.google.firebase.messaging.default_notification_color">
 * into AndroidManifest.xml with different values (expo-notifications uses the
 * app's configured color; react-native-firebase_messaging defaults to white).
 * Gradle's manifest merger refuses to pick one automatically and fails the
 * build with:
 *   "Attribute meta-data#com.google.firebase.messaging.default_notification_color
 *    ... is also present at [:react-native-firebase_messaging] ... Suggestion:
 *    add 'tools:replace="android:resource"' to <meta-data> element to override."
 *
 * This does exactly what Gradle suggests: adds tools:replace to that meta-data
 * element so the app's own value always wins.
 *
 * Order-independent by design: rather than finding an element that
 * expo-notifications' own withAndroidManifest mod is expected to have already
 * added (unreliable — confirmed empirically that plugins.json array order does
 * NOT guarantee withAndroidManifest execution order across plugins here), this
 * uses the same addMetaDataItemToMainApplication utility expo-notifications
 * itself uses to ensure the element exists with the right value, then adds
 * tools:replace to it. addMetaDataItemToMainApplication only ever touches the
 * android:resource/android:value attribute on an existing match (see
 * @expo/config-plugins/build/android/Manifest.js) — it never touches other
 * attributes — so this is safe to run before OR after expo-notifications' own
 * mod runs.
 */

const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const META_DATA_NAME = 'com.google.firebase.messaging.default_notification_color';
const NOTIFICATION_ICON_COLOR_RESOURCE = '@color/notification_icon_color';
const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

function withNotificationColorManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = TOOLS_NAMESPACE;
    }

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      META_DATA_NAME,
      NOTIFICATION_ICON_COLOR_RESOURCE,
      'resource'
    );

    const target = mainApplication['meta-data'].find(
      (item) => item.$['android:name'] === META_DATA_NAME
    );
    target.$['tools:replace'] = 'android:resource';

    console.log(`[withNotificationColorManifestFix] Ensured tools:replace on ${META_DATA_NAME}`);

    return config;
  });
}

module.exports = withNotificationColorManifestFix;
