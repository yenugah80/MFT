/**
 * Expo Config Plugin: Exclude Legacy com.android.support Artifacts
 *
 * Root cause behind the notification-color and appComponentFactory manifest
 * merger conflicts (see withAndroidManifestMergerFixes.js): some dependency
 * in the tree pulls in the old pre-AndroidX com.android.support:support-compat
 * (and animated-vector-drawable / support-vector-drawable / versionedparcelable)
 * artifacts unjetified, alongside androidx.core. tools:replace in the manifest
 * only patches XML attributes — it can't fix actual duplicated compiled
 * classes, which is the next failure this causes:
 *
 *   Execution failed for task ':app:checkReleaseDuplicateClasses'.
 *   > Duplicate class android.support.v4.app.INotificationSideChannel found
 *     in modules core-1.17.0.aar (androidx.core:core:1.17.0) and
 *     support-compat-28.0.0.aar (com.android.support:support-compat:28.0.0)
 *   (27 distinct duplicate classes from the same module pair)
 *
 * Excluding the whole com.android.support group at the app module's
 * configuration level is the standard fix for this class of error — it
 * forces every dependency in the tree to resolve to the AndroidX
 * equivalents instead, fixing the duplicate classes AND making the
 * manifest merger fixes in withAndroidManifestMergerFixes.js redundant
 * (harmless to leave both in place — if there's nothing left to conflict
 * with, tools:replace is a no-op).
 */

const { withAppBuildGradle } = require('expo/config-plugins');

const EXCLUSION_BLOCK = `
configurations.all {
    exclude group: 'com.android.support'
}
`;

function withExcludeLegacySupportLibrary(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes("exclude group: 'com.android.support'")) {
      console.log('[withExcludeLegacySupportLibrary] Exclusion already present — skipping');
      return config;
    }

    if (!contents.includes('\nandroid {')) {
      console.warn('[withExcludeLegacySupportLibrary] Could not find "android {" block — skipping');
      return config;
    }

    contents = contents.replace('\nandroid {', `\nandroid {\n${EXCLUSION_BLOCK}`);
    config.modResults.contents = contents;
    console.log("[withExcludeLegacySupportLibrary] Added configurations.all exclude for com.android.support");

    return config;
  });
}

module.exports = withExcludeLegacySupportLibrary;
