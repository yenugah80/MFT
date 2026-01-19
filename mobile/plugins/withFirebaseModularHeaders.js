/**
 * Expo Config Plugin: Firebase Modular Headers Fix
 *
 * Adds modular_headers for Firebase dependencies to fix the Swift pod integration issue:
 * "The Swift pod `FirebaseCoreInternal` depends upon `GoogleUtilities`, which does not define modules."
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if we already added the modular headers
        if (!podfileContent.includes("pod 'GoogleUtilities', :modular_headers => true")) {
          // Find the line "prepare_react_native_project!" and add our pods after it
          const insertAfter = 'prepare_react_native_project!';
          const modularHeadersPods = `
# Firebase modular headers fix (added by withFirebaseModularHeaders plugin)
pod 'GoogleUtilities', :modular_headers => true
pod 'FirebaseCore', :modular_headers => true
pod 'FirebaseCoreInternal', :modular_headers => true
`;

          if (podfileContent.includes(insertAfter)) {
            podfileContent = podfileContent.replace(
              insertAfter,
              `${insertAfter}\n${modularHeadersPods}`
            );

            fs.writeFileSync(podfilePath, podfileContent);
            console.log('[withFirebaseModularHeaders] Added modular headers to Podfile');
          } else {
            console.warn('[withFirebaseModularHeaders] Could not find insertion point in Podfile');
          }
        } else {
          console.log('[withFirebaseModularHeaders] Modular headers already present in Podfile');
        }
      }

      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
