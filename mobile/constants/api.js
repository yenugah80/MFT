import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the correct localhost URL based on platform
 * - iOS Simulator: localhost works
 * - Android Emulator: needs 10.0.2.2 (special localhost)
 * - Physical Device: uses EXPO_PUBLIC_API_URL or warns user
 */
function getDevApiUrl() {
  // If user provided custom URL, use it (highest priority)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Android emulator needs special localhost address
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api';
  }

  // iOS Simulator can use localhost
  return 'http://localhost:5001/api';
}

// Base API URL
// Automatically uses platform-specific localhost in development
export const API_URL = __DEV__
  ? getDevApiUrl()
  : 'https://myfoodtracker.onrender.com/api';

// Legacy export for backwards compatibility (profileAPI uses this without /api)
// Derive from API_URL by removing /api suffix
export const API_BASE_URL = API_URL.replace(/\/api$/, '');

// Helper to check if running on physical device
export const isPhysicalDevice = Constants.isDevice;

// Log API configuration in development for debugging
if (__DEV__) {
  console.log('[API Config] Platform:', Platform.OS);
  console.log('[API Config] Using API URL:', API_URL);
  console.log('[API Config] Physical device:', isPhysicalDevice);

  if (isPhysicalDevice && !process.env.EXPO_PUBLIC_API_URL) {
    console.warn(
      '[API Config] ⚠️  Running on physical device without EXPO_PUBLIC_API_URL set!\n' +
      'Add EXPO_PUBLIC_API_URL to your .env file with your computer\'s IP address.\n' +
      'Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:5001/api'
    );
  }
}