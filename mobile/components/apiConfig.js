import { Platform } from 'react-native';

/**
 * API Configuration
 * 
 * Root Cause of "Backend offline":
 * 1. 'localhost' only works on iOS Simulators.
 * 2. Android Emulators require '10.0.2.2'.
 * 3. Physical devices require your computer's local IP (e.g., '192.168.1.XX').
 */
const BASE_URL = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const API_CONFIG = {
  BASE_URL: __DEV__ ? BASE_URL : 'https://api.yourproduction.com',
  ENDPOINTS: {
    ANALYZE_OCR: '/analyze/ocr',
  },
};