import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiUrl() {
  // Dev-only override so a local/mock backend can be exercised without ever
  // pointing a production build at anything but Railway.
  if (__DEV__ && process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  return 'https://api.my-food-tracker.com/api';
}

// Base API URL
// Uses EXPO_PUBLIC_API_BASE_URL in development when set, Railway backend otherwise
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
