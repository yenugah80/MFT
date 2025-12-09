// Base API URL (dev = local, prod = deployed)
// For production: Uses deployed Render.com URL
// For local development: Use localhost. Android Emulator needs 'adb reverse tcp:5001 tcp:5001'
export const API_URL =
	process.env.EXPO_PUBLIC_API_URL ||
	(__DEV__ ? "http://localhost:5001/api" : "https://myfoodtracker.onrender.com/api");

// Legacy export for backwards compatibility (profileAPI uses this without /api)
export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_URL ||
	(__DEV__ ? "http://localhost:5001" : "https://myfoodtracker.onrender.com");