// Base API URL
// Automatically uses localhost in development, production URL in production builds
// This ensures the app works correctly regardless of environment
export const API_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001/api")
  : "https://myfoodtracker.onrender.com/api";

// Legacy export for backwards compatibility (profileAPI uses this without /api)
// Derive from API_URL by removing /api suffix
export const API_BASE_URL = API_URL.replace(/\/api$/, "");