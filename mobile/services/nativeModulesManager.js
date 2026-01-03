/**
 * Native Modules Manager
 * Safely loads all native Expo modules with graceful degradation
 * Production-grade error handling for iOS and Android
 *
 * Features:
 * - Lazy loads all native modules on demand
 * - Provides stubs/fallbacks for unavailable modules
 * - Tracks which modules failed to load
 * - Safe for simulator and physical devices
 */

const NativeModulesState = {
  loaded: false,
  modules: {},
  failed: {},
  stubs: {},
};

/**
 * Safely load a native module with fallback
 */
async function loadModule(moduleName, fallbackValue = null) {
  try {
    if (NativeModulesState.modules[moduleName]) {
      return NativeModulesState.modules[moduleName];
    }

    const module = await import(`expo-${moduleName.toLowerCase()}`);
    NativeModulesState.modules[moduleName] = module;
    return module;
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.warn(`[NativeModules] Failed to load expo-${moduleName}:`, errorMsg);

    NativeModulesState.failed[moduleName] = errorMsg;

    // Return fallback/stub
    const stub = fallbackValue || getStub(moduleName);
    NativeModulesState.stubs[moduleName] = stub;
    return stub;
  }
}

/**
 * Get stub/fallback for unavailable modules
 */
function getStub(moduleName) {
  const stubs = {
    notifications: { setNotificationHandler: () => {}, getExpoPushTokenAsync: () => null },
    device: { isDevice: false },
    constants: { expoConfig: {} },
    haptics: { selectionAsync: () => {}, notificationAsync: () => {} },
    camera: { CameraView: null, useCameraPermissions: () => [{ granted: false }] },
    av: { Audio: { Recording: {} }, Video: {} },
    tts: { speak: () => Promise.resolve() },
    'mlkit-ocr': { recognizeFromURI: () => Promise.resolve(null) },
    'image-picker': { launchCameraAsync: () => Promise.resolve({ cancelled: true }), launchImageLibraryAsync: () => Promise.resolve({ cancelled: true }) },
    'image-manipulator': { manipulateAsync: () => Promise.resolve({ uri: null }) },
    'secure-store': { getItemAsync: () => Promise.resolve(null), setItemAsync: () => Promise.resolve() },
    localization: { locale: 'en-US', getCalendars: () => [] },
  };

  return stubs[moduleName] || {};
}

/**
 * Initialize all critical modules at startup
 */
export async function initializeNativeModules() {
  if (NativeModulesState.loaded) return;

  console.debug('[NativeModules] Initializing native modules...');

  // Load critical modules
  const criticalModules = ['constants', 'device', 'notifications', 'secure-store'];

  for (const moduleName of criticalModules) {
    await loadModule(moduleName);
  }

  NativeModulesState.loaded = true;
  logModuleStatus();
}

/**
 * Lazy load a module on demand
 */
export async function getModule(moduleName) {
  return loadModule(moduleName);
}

/**
 * Get module synchronously (returns stub if not loaded)
 */
export function getModuleSync(moduleName) {
  return NativeModulesState.modules[moduleName] || getStub(moduleName);
}

/**
 * Check if module is available
 */
export function isModuleAvailable(moduleName) {
  return !!NativeModulesState.modules[moduleName];
}

/**
 * Get status of all modules
 */
export function getModuleStatus() {
  return {
    loaded: NativeModulesState.loaded,
    modules: Object.keys(NativeModulesState.modules),
    failed: NativeModulesState.failed,
    stubs: Object.keys(NativeModulesState.stubs),
  };
}

/**
 * Log module initialization status
 */
function logModuleStatus() {
  const status = getModuleStatus();

  if (Object.keys(status.failed).length === 0) {
    console.debug('[NativeModules] ✓ All modules loaded successfully');
  } else {
    console.debug(
      '[NativeModules] ⚠️ Some modules unavailable (expected on simulator):',
      Object.keys(status.failed).join(', ')
    );
  }
}

/**
 * Exported modules for use in the app
 */
export const Modules = {
  // Notifications
  async notifications() {
    return getModule('notifications');
  },

  // Device
  async device() {
    return getModule('device');
  },

  // Constants
  async constants() {
    return getModule('constants');
  },

  // Haptics
  async haptics() {
    return getModule('haptics');
  },

  // Camera
  async camera() {
    return getModule('camera');
  },

  // Audio/Video
  async av() {
    return getModule('av');
  },

  // Text-to-Speech
  async tts() {
    return getModule('tts');
  },

  // ML Kit OCR
  async ocr() {
    return getModule('mlkit-ocr');
  },

  // Image Picker
  async imagePicker() {
    return getModule('image-picker');
  },

  // Image Manipulator
  async imageManipulator() {
    return getModule('image-manipulator');
  },

  // Secure Store
  async secureStore() {
    return getModule('secure-store');
  },

  // Localization
  async localization() {
    return getModule('localization');
  },
};

export default {
  initializeNativeModules,
  getModule,
  getModuleSync,
  isModuleAvailable,
  getModuleStatus,
  Modules,
};
