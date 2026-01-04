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

/**
 * IMPORTANT: This module does NOT use React hooks like useCameraPermissions()
 * React hooks can only be called within React components
 * We use native async APIs instead (requestPermissionsAsync, etc.)
 * Components should use permission hooks directly when needed
 */

import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as AV from 'expo-av';

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
 * Request camera permissions (native async API, not a hook)
 * Call this when user tries to access camera
 */
export async function requestCameraPermissionAsync() {
  try {
    const permission = await Camera.requestCameraPermissionsAsync();
    return formatPermissionStatus(permission, PERMISSION_TYPES.CAMERA);
  } catch (error) {
    console.error('[PermissionsHandler] Camera permission request failed:', error.message);
    return { status: 'error', granted: false, message: error.message };
  }
}

/**
 * Request photo library permissions (native async API)
 */
export async function requestPhotoLibraryPermissionAsync() {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    PermissionState.requested.add(PERMISSION_TYPES.PHOTO_LIBRARY);
    return formatPermissionStatus(permission, PERMISSION_TYPES.PHOTO_LIBRARY);
  } catch (error) {
    console.error('[PermissionsHandler] Photo library permission request failed:', error.message);
    return { status: 'error', granted: false, message: error.message };
  }
}

/**
 * Request microphone permissions (native async API)
 */
export async function requestMicrophonePermissionAsync() {
  try {
    const permission = await AV.Audio.requestPermissionsAsync();
    PermissionState.requested.add(PERMISSION_TYPES.MICROPHONE);
    return formatPermissionStatus(permission, PERMISSION_TYPES.MICROPHONE);
  } catch (error) {
    console.error('[PermissionsHandler] Microphone permission request failed:', error.message);
    return { status: 'error', granted: false, message: error.message };
  }
}

/**
 * Request all required permissions at once
 * Call this when user tries to access multiple features
 * NOTE: Do NOT call this during app initialization - request permissions on-demand only
 */
export async function requestAllPermissionsAsync() {
  console.debug('[PermissionsHandler] Requesting all required permissions...');

  const results = {
    camera: await requestCameraPermissionAsync(),
    microphone: await requestMicrophonePermissionAsync(),
    photoLibrary: await requestPhotoLibraryPermissionAsync(),
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
 * Check if permission was already requested this session
 */
export function wasPermissionRequested(type) {
  return PermissionState.requested.has(type);
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
  requestCameraPermissionAsync,
  requestPhotoLibraryPermissionAsync,
  requestMicrophonePermissionAsync,
  requestAllPermissionsAsync,
  getPermissionStatus,
  isPermissionGranted,
  getAllPermissionStatuses,
  wasPermissionRequested,
  logPermissionStatus,
  IOS_PRIVACY_PLIST_KEYS,
};
