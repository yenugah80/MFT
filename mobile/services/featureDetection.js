/**
 * Feature Detection Service
 * Detects available device features and gracefully handles unavailable ones
 * Production-grade feature availability checking
 *
 * Allows conditional UI rendering and feature graceful degradation
 */

import { Platform } from 'react-native';
import { Modules } from './nativeModulesManager';

/**
 * Feature availability cache
 */
const FeatureCache = {
  checked: false,
  features: {},
};

// Feature check functions map - used for lazy detection
const featureCheckFns = {
  pushNotifications: checkPushNotifications,
  camera: checkCamera,
  photoLibrary: checkPhotoLibrary,
  cameraPicker: checkImagePicker,
  audioRecording: checkAudioRecording,
  textToSpeech: checkTextToSpeech,
  ocr: checkOCR,
  secureStorage: checkSecureStorage,
  haptics: checkHaptics,
  imageManipulation: checkImageManipulation,
  localization: checkLocalization,
  isPhysicalDevice: checkPhysicalDevice,
  platform: () => Promise.resolve(Platform.OS),
};

// Critical features to check at startup (needed immediately)
const CRITICAL_FEATURES = ['secureStorage', 'platform'];

/**
 * Detect available features - OPTIMIZED
 *
 * STRATEGY:
 * - Only check CRITICAL features at startup (secureStorage, platform)
 * - Other features are checked lazily when first requested
 * - Reduces startup time from ~1200ms to ~50ms
 */
export async function detectAvailableFeatures() {
  if (FeatureCache.checked) {
    return FeatureCache.features;
  }

  console.debug('[FeatureDetection] ▶ Detecting critical features only (lazy mode)...');

  // Only check critical features at startup
  const criticalChecks = CRITICAL_FEATURES.map(async (featureName) => {
    const checkFn = featureCheckFns[featureName];
    if (checkFn) {
      try {
        const available = await checkFn();
        return { name: featureName, available };
      } catch {
        return { name: featureName, available: false };
      }
    }
    return { name: featureName, available: false };
  });

  const results = await Promise.all(criticalChecks);

  // Initialize features with critical results
  results.forEach(({ name, available }) => {
    FeatureCache.features[name] = available;
  });

  FeatureCache.checked = true;

  console.debug('[FeatureDetection] ✓ Critical features checked:',
    Object.entries(FeatureCache.features)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ') || 'none'
  );

  return FeatureCache.features;
}

/**
 * Check a specific feature lazily (on-demand)
 * Used when a feature is requested but hasn't been checked yet
 */
async function checkFeatureLazy(featureName) {
  if (FeatureCache.features[featureName] !== undefined) {
    return FeatureCache.features[featureName];
  }

  const checkFn = featureCheckFns[featureName];
  if (!checkFn) {
    console.warn(`[FeatureDetection] Unknown feature: ${featureName}`);
    return false;
  }

  try {
    const available = await checkFn();
    FeatureCache.features[featureName] = available;
    console.debug(`[FeatureDetection] Lazy check: ${featureName} = ${available}`);
    return available;
  } catch {
    FeatureCache.features[featureName] = false;
    return false;
  }
}

/**
 * Check if push notifications are available
 */
async function checkPushNotifications() {
  try {
    const Notifications = await Modules.notifications();
    return !!Notifications && !!Notifications.getExpoPushTokenAsync;
  } catch {
    return false;
  }
}

/**
 * Check if camera is available
 */
async function checkCamera() {
  try {
    const Camera = await Modules.camera();
    return !!Camera && !!Camera.CameraView;
  } catch {
    return false;
  }
}

/**
 * Check if photo library access is available
 * Verifies ability to launch image library picker
 */
async function checkPhotoLibrary() {
  try {
    const ImagePicker = await Modules.imagePicker();
    return !!ImagePicker && typeof ImagePicker.launchImageLibraryAsync === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if camera picker is available
 * Verifies ability to launch camera picker
 * NOTE: This is different from photo library - it launches the camera interface
 */
async function checkImagePicker() {
  try {
    const ImagePicker = await Modules.imagePicker();
    // Correct: Check launchCameraAsync (camera picker, not library)
    return !!ImagePicker && typeof ImagePicker.launchCameraAsync === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if audio recording is available
 */
async function checkAudioRecording() {
  try {
    const AV = await Modules.av();
    return !!AV && !!AV.Audio && !!AV.Audio.Recording;
  } catch {
    return false;
  }
}

/**
 * Check if text-to-speech is available
 */
async function checkTextToSpeech() {
  try {
    const Speech = await Modules.speech();
    return !!Speech && typeof Speech.speak === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if OCR is available
 */
async function checkOCR() {
  try {
    const OCR = await Modules.ocr();
    return !!OCR && typeof OCR.recognizeFromURI === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if secure storage is available
 */
async function checkSecureStorage() {
  try {
    const SecureStore = await Modules.secureStore();
    return !!SecureStore && typeof SecureStore.getItemAsync === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if haptics are available
 */
async function checkHaptics() {
  try {
    const Haptics = await Modules.haptics();
    return !!Haptics && typeof Haptics.selectionAsync === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if image manipulation is available
 */
async function checkImageManipulation() {
  try {
    const ImageManipulator = await Modules.imageManipulator();
    return !!ImageManipulator && typeof ImageManipulator.manipulateAsync === 'function';
  } catch {
    return false;
  }
}

/**
 * Check if localization is available
 */
async function checkLocalization() {
  try {
    const Localization = await Modules.localization();
    return !!Localization && !!Localization.locale;
  } catch {
    return false;
  }
}

/**
 * Check if running on physical device
 */
async function checkPhysicalDevice() {
  try {
    const Device = await Modules.device();
    return Device?.isDevice === true;
  } catch {
    return false;
  }
}

/**
 * Get feature availability (sync version - returns cached or false)
 */
export function getFeature(featureName) {
  // Return cached value if available
  if (FeatureCache.features[featureName] !== undefined) {
    return FeatureCache.features[featureName] === true;
  }
  // For unchecked features, trigger lazy check in background and return false for now
  checkFeatureLazy(featureName);
  return false;
}

/**
 * Get feature availability (async version - checks lazily if needed)
 */
export async function getFeatureAsync(featureName) {
  if (FeatureCache.features[featureName] !== undefined) {
    return FeatureCache.features[featureName] === true;
  }
  return await checkFeatureLazy(featureName);
}

/**
 * Check multiple features at once
 */
export function hasFeatures(...features) {
  return features.every((feature) => getFeature(feature));
}

/**
 * Check if any of the features are available
 */
export function hasAnyFeature(...features) {
  return features.some((feature) => getFeature(feature));
}

/**
 * Get all features
 */
export function getAllFeatures() {
  return { ...FeatureCache.features };
}

/**
 * Get unavailable features
 */
export function getUnavailableFeatures() {
  const unavailable = {};
  for (const [feature, available] of Object.entries(FeatureCache.features)) {
    if (!available) {
      unavailable[feature] = false;
    }
  }
  return unavailable;
}

/**
 * Log feature detection status
 */
function logFeatureStatus(features) {
  const available = Object.entries(features)
    .filter(([, available]) => available)
    .map(([name]) => name);

  const unavailable = Object.entries(features)
    .filter(([, available]) => !available)
    .map(([name]) => name);

  console.debug('[FeatureDetection] ✓ Available features:', available.join(', '));

  if (unavailable.length > 0) {
    console.debug('[FeatureDetection] ⚠️ Unavailable features:', unavailable.join(', '));
  }
}

export default {
  detectAvailableFeatures,
  getFeature,
  getFeatureAsync,
  hasFeatures,
  hasAnyFeature,
  getAllFeatures,
  getUnavailableFeatures,
};
