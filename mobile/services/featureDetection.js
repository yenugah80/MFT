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

/**
 * Detect all available features at startup
 *
 * STRATEGY:
 * - Caches result after first check
 * - Uses Promise.allSettled to prevent one failure from blocking others
 * - Logs all unavailable features for debugging
 */
export async function detectAvailableFeatures() {
  if (FeatureCache.checked) {
    return FeatureCache.features;
  }

  console.debug('[FeatureDetection] ▶ Detecting available features...');

  // Define all feature checks as a map
  const featureChecks = {
    // Push Notifications
    pushNotifications: checkPushNotifications,

    // Camera & Photo
    camera: checkCamera,
    photoLibrary: checkPhotoLibrary,
    cameraPicker: checkImagePicker, // Renamed from 'imagePicker' for clarity

    // Audio & Voice
    audioRecording: checkAudioRecording,
    textToSpeech: checkTextToSpeech,

    // OCR
    ocr: checkOCR,

    // Secure Storage
    secureStorage: checkSecureStorage,

    // Haptics
    haptics: checkHaptics,

    // Image Manipulation
    imageManipulation: checkImageManipulation,

    // Localization
    localization: checkLocalization,

    // Device Info
    isPhysicalDevice: checkPhysicalDevice,
    platform: () => Promise.resolve(Platform.OS),
  };

  // Run all checks in parallel
  const results = await Promise.allSettled(
    Object.entries(featureChecks).map(async ([featureName, checkFn]) => ({
      name: featureName,
      available: await checkFn(),
    }))
  );

  // Aggregate results
  const features = {};
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { name, available } = result.value;
      features[name] = available;
    } else {
      console.warn(`[FeatureDetection] Failed to check feature:`, result.reason);
      features[result.reason.name || 'unknown'] = false;
    }
  });

  FeatureCache.features = features;
  FeatureCache.checked = true;

  logFeatureStatus(features);
  return features;
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
 * Get feature availability
 */
export function getFeature(featureName) {
  if (!FeatureCache.checked) {
    console.warn('[FeatureDetection] Features not detected yet. Call detectAvailableFeatures() first.');
    return false;
  }
  return FeatureCache.features[featureName] === true;
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
  hasFeatures,
  hasAnyFeature,
  getAllFeatures,
  getUnavailableFeatures,
};
