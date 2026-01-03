/**
 * iOS Permissions Handler
 * Manages all iOS-specific permissions and entitlements
 * Production-grade permission management for App Store compliance
 *
 * Handles:
 * - Camera permissions
 * - Photo library permissions
 * - Microphone permissions
 * - Health data (if applicable)
 * - Location (if applicable)
 */

import { Modules } from './nativeModulesManager';

/**
 * Permission status tracking
 */
const PermissionState = {
  checked: false,
  statuses: {},
  requested: new Set(),
};

/**
 * iOS permission types we support
 */
const PERMISSION_TYPES = {
  CAMERA: 'camera',
  PHOTO_LIBRARY: 'photoLibrary',
  MICROPHONE: 'microphone',
  MEDIA_LIBRARY: 'mediaLibrary',
};

/**
 * Check camera permissions
 */
export async function checkCameraPermission() {
  try {
    const Camera = await Modules.camera();
    if (!Camera || !Camera.useCameraPermissions) {
      return { status: 'unavailable', message: 'Camera not available on this device' };
    }

    const [permission] = await Camera.useCameraPermissions();
    return formatPermissionStatus(permission, PERMISSION_TYPES.CAMERA);
  } catch (error) {
    console.error('[PermissionsHandler] Camera permission check failed:', error.message);
    return { status: 'error', message: error.message };
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission() {
  try {
    const Camera = await Modules.camera();
    if (!Camera || !Camera.useCameraPermissions) {
      return { status: 'unavailable', granted: false };
    }

    const [permission, requestPermission] = await Camera.useCameraPermissions();

    if (permission?.granted) {
      return { status: 'granted', granted: true };
    }

    const result = await requestPermission();
    PermissionState.requested.add(PERMISSION_TYPES.CAMERA);

    return formatPermissionStatus(result, PERMISSION_TYPES.CAMERA);
  } catch (error) {
    console.error('[PermissionsHandler] Camera permission request failed:', error.message);
    return { status: 'error', granted: false, message: error.message };
  }
}

/**
 * Check photo library permissions
 */
export async function checkPhotoLibraryPermission() {
  try {
    const ImagePicker = await Modules.imagePicker();
    if (!ImagePicker) {
      return { status: 'unavailable', message: 'Photo library not available' };
    }

    // Image picker doesn't have direct permission check, so we return the status
    return { status: 'unknown', granted: false, message: 'Photo library permission status unknown' };
  } catch (error) {
    console.error('[PermissionsHandler] Photo library permission check failed:', error.message);
    return { status: 'error', message: error.message };
  }
}

/**
 * Check microphone permissions
 */
export async function checkMicrophonePermission() {
  try {
    const AV = await Modules.av();
    if (!AV || !AV.Audio) {
      return { status: 'unavailable', message: 'Audio not available on this device' };
    }

    // Audio permission check through recording
    try {
      const permission = await AV.Audio.getPermissionsAsync();
      return formatPermissionStatus(permission, PERMISSION_TYPES.MICROPHONE);
    } catch {
      return { status: 'unknown', granted: false };
    }
  } catch (error) {
    console.error('[PermissionsHandler] Microphone permission check failed:', error.message);
    return { status: 'error', message: error.message };
  }
}

/**
 * Request microphone permissions
 */
export async function requestMicrophonePermission() {
  try {
    const AV = await Modules.av();
    if (!AV || !AV.Audio) {
      return { status: 'unavailable', granted: false };
    }

    const permission = await AV.Audio.requestPermissionsAsync();
    PermissionState.requested.add(PERMISSION_TYPES.MICROPHONE);

    return formatPermissionStatus(permission, PERMISSION_TYPES.MICROPHONE);
  } catch (error) {
    console.error('[PermissionsHandler] Microphone permission request failed:', error.message);
    return { status: 'error', granted: false, message: error.message };
  }
}

/**
 * Check all critical permissions
 */
export async function checkAllPermissions() {
  console.debug('[PermissionsHandler] Checking all critical permissions...');

  const permissions = {
    camera: await checkCameraPermission(),
    microphone: await checkMicrophonePermission(),
    photoLibrary: await checkPhotoLibraryPermission(),
  };

  PermissionState.statuses = permissions;
  PermissionState.checked = true;

  return permissions;
}

/**
 * Request all required permissions
 */
export async function requestAllPermissions() {
  console.debug('[PermissionsHandler] Requesting all required permissions...');

  const results = {
    camera: await requestCameraPermission(),
    microphone: await requestMicrophonePermission(),
  };

  return results;
}

/**
 * Format permission status
 */
function formatPermissionStatus(permission, type) {
  if (!permission) {
    return {
      status: 'error',
      type,
      granted: false,
      message: 'Permission object not found',
    };
  }

  return {
    status: permission.granted ? 'granted' : permission.status === 'denied' ? 'denied' : 'undetermined',
    type,
    granted: permission.granted === true,
    canAskAgain: permission.canAskAgain !== false,
  };
}

/**
 * Get permission status
 */
export function getPermissionStatus(type) {
  return PermissionState.statuses[type] || { status: 'unknown', granted: false };
}

/**
 * Check if permission is granted
 */
export function isPermissionGranted(type) {
  return PermissionState.statuses[type]?.granted === true;
}

/**
 * Get all permission statuses
 */
export function getAllPermissionStatuses() {
  return { ...PermissionState.statuses };
}

/**
 * iOS-specific privacy.plist notes
 * These should be added to app.json or eas.json:
 *
 * For EAS build, add to app.json under "ios" section:
 * {
 *   "infoPlist": {
 *     "NSCameraUsageDescription": "Camera access is required to scan barcodes and take food photos",
 *     "NSPhotoLibraryUsageDescription": "Photo library access is required to select food images",
 *     "NSMicrophoneUsageDescription": "Microphone access is required for voice food logging",
 *     "NSLocalNetworkUsageDescription": "Local network access for better connectivity"
 *   }
 * }
 */
export const IOS_PRIVACY_PLIST_KEYS = {
  CAMERA:
    'Camera access is required to scan barcodes and take food photos',
  PHOTO_LIBRARY:
    'Photo library access is required to select food images',
  MICROPHONE:
    'Microphone access is required for voice food logging',
  LOCAL_NETWORK:
    'Local network access for better connectivity',
};

/**
 * Log permission status
 */
export function logPermissionStatus() {
  console.debug('[PermissionsHandler] Permission Status:');
  Object.entries(PermissionState.statuses).forEach(([type, status]) => {
    const icon = status.granted ? '✓' : '✗';
    console.debug(`  ${icon} ${type}: ${status.status}`);
  });
}

export default {
  checkCameraPermission,
  requestCameraPermission,
  checkPhotoLibraryPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
  checkAllPermissions,
  requestAllPermissions,
  getPermissionStatus,
  isPermissionGranted,
  getAllPermissionStatuses,
  logPermissionStatus,
  IOS_PRIVACY_PLIST_KEYS,
};
