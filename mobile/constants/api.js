import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the correct API URL based on environment
 * - Always prefer custom EXPO_PUBLIC_API_URL if set
 * - In production: use Render backend
 * - In development: use Render backend (NOT localhost)
 */
function getApiUrl() {
  // If user provided custom URL, use it (highest priority)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Always use Render backend (both dev and production)
  return 'https://myfoodtracker.onrender.com/api';
}

// Base API URL
// Use Render backend in both development and production for consistency
export const API_URL = getApiUrl();

// Legacy export for backwards compatibility (profileAPI uses this without /api)
// Derive from API_URL by removing /api suffix
export const API_BASE_URL = API_URL.replace(/\/api$/, '');

// Helper to check if running on physical device
export const isPhysicalDevice = Constants.isDevice;

// Log API configuration in development for debugging
if (__DEV__) {
  const mode = process.env.EXPO_PUBLIC_API_URL ? 'Custom' : 'Render Backend';
  console.log(`[API Config] 🚀 Mode: ${mode} | Platform: ${Platform.OS}`);
  console.log(`[API Config] 📡 Using API URL: ${API_URL}`);
  console.log(`[API Config] 📱 Physical device: ${isPhysicalDevice}`);
  console.log(`[API Config] ✅ All requests will use Render backend (no localhost in dev mode)`);

  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log(`[API Config] 🔧 Custom API URL detected: ${process.env.EXPO_PUBLIC_API_URL}`);
  }
}