import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the correct API URL based on environment
 * - Always prefer custom EXPO_PUBLIC_API_BASE_URL if set
 * - Default: Hetzner backend
 */
function getApiUrl() {
  // If user provided custom URL, use it (highest priority)
  // NOTE: Variable name is EXPO_PUBLIC_API_BASE_URL (matches environmentValidation.js)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Default: Production backend (Railway)
  return 'https://api.my-food-tracker.com/api';
}

// Base API URL
// Use Railway backend in both development and production
export const API_URL = getApiUrl();

// Legacy export for backwards compatibility (profileAPI uses this without /api)
// Derive from API_URL by removing /api suffix
export const API_BASE_URL = API_URL.replace(/\/api$/, '');

// Web requests must avoid custom headers that trigger CORS preflights the backend
// does not currently allow. Native clients can still send the timezone offset.
export const shouldSendTimezoneOffsetHeader = Platform.OS !== 'web';

export function getTimezoneOffsetHeaders() {
  if (!shouldSendTimezoneOffsetHeader) {
    return {};
  }

  return {
    'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
  };
}

// Helper to check if running on physical device
export const isPhysicalDevice = Constants.isDevice;

// Log API configuration in development for debugging
if (__DEV__) {
  const mode = process.env.EXPO_PUBLIC_API_BASE_URL ? 'Custom' : 'Railway Backend';
  console.log(`[API Config] 🚀 Mode: ${mode} | Platform: ${Platform.OS}`);
  console.log(`[API Config] 📡 Using API URL: ${API_URL}`);
  console.log(`[API Config] 📱 Physical device: ${isPhysicalDevice}`);
  console.log(`[API Config] ✅ All requests will use configured backend`);

  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    console.log(`[API Config] 🔧 Custom API URL detected: ${process.env.EXPO_PUBLIC_API_BASE_URL}`);
  }
}
