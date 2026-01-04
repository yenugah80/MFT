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
 * Module import map (required for Metro bundler compatibility)
 */
const moduleImportMap = {
  notifications: () => import('expo-notifications'),
  device: () => import('expo-device'),
  constants: () => import('expo-constants'),
  haptics: () => import('expo-haptics'),
  camera: () => import('expo-camera'),
  av: () => import('expo-av'),
  speech: () => import('expo-speech'),
  'mlkit-ocr': () => import('expo-mlkit-ocr'),
  'image-picker': () => import('expo-image-picker'),
  'image-manipulator': () => import('expo-image-manipulator'),
  'secure-store': () => import('expo-secure-store'),
  localization: () => import('expo-localization'),
};

/**
 * Safely load a native module with fallback and timeout protection
 *
 * TIMEOUT: 5s per module (prevents stalled module loads from blocking startup)
 * FALLBACK: Returns properly-structured stub if load fails
 */
async function loadModule(moduleName, fallbackValue = null) {
  const MODULE_TIMEOUT = 5000; // 5 seconds per module

  try {
    // Check if already loaded
    if (NativeModulesState.modules[moduleName]) {
      return NativeModulesState.modules[moduleName];
    }

    const moduleLoader = moduleImportMap[moduleName.toLowerCase()];
    if (!moduleLoader) {
      throw new Error(`Module ${moduleName} not in import map`);
    }

    // Load with timeout protection
    const module = await Promise.race([
      moduleLoader(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Module load timeout after ${MODULE_TIMEOUT}ms`)), MODULE_TIMEOUT)
      ),
    ]);

    NativeModulesState.modules[moduleName] = module;
    return module;
  } catch (error) {
    const errorMsg = error?.message || String(error);
    const isTimeout = error?.message?.includes('timeout');

    console.warn(
      `[NativeModules] ${isTimeout ? 'TIMEOUT' : 'Failed'} loading expo-${moduleName}: ${errorMsg}`
    );

    NativeModulesState.failed[moduleName] = errorMsg;

    // Return fallback/stub
    const stub = fallbackValue || getStub(moduleName);
    NativeModulesState.stubs[moduleName] = stub;
    return stub;
  }
}

/**
 * Get stub/fallback for unavailable modules
 * Stubs must match real module interfaces to prevent crashes
 */
function getStub(moduleName) {
  const stubs = {
    notifications: {
      setNotificationHandler: () => {},
      getExpoPushTokenAsync: () => Promise.resolve({ data: null }),
      addNotificationReceivedListener: () => ({ remove: () => {} }),
      addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    },
    device: {
      isDevice: false,
      brand: 'unknown',
      manufacturer: 'unknown',
      modelName: 'simulator',
    },
    constants: {
      expoConfig: {},
      deviceName: 'simulator',
      nativeAppVersion: '0.0.0',
      nativeBuildVersion: '0',
    },
    haptics: {
      selectionAsync: () => Promise.resolve(),
      notificationAsync: () => Promise.resolve(),
      impactAsync: () => Promise.resolve(),
    },
    camera: {
      CameraView: null,
      useCameraPermissions: () => {
        // Return hook-like structure: [permission, requestPermission]
        const mockPermission = { granted: false, pending: false, canAskAgain: true };
        const mockRequest = () => Promise.resolve(mockPermission);
        return [mockPermission, mockRequest];
      },
      Camera: null,
    },
    av: {
      Audio: {
        Recording: {
          createAsync: () => Promise.resolve({ sound: null, recording: null }),
        },
        Sound: {
          createAsync: () => Promise.resolve({ sound: null }),
        },
      },
      Video: {
        useVideoPlayer: () => ({ play: () => {}, pause: () => {}, replace: () => {} }),
      },
    },
    speech: {
      speak: () => Promise.resolve(),
      stop: () => Promise.resolve(),
      pause: () => Promise.resolve(),
      resume: () => Promise.resolve(),
      isSpeaking: () => false,
    },
    'mlkit-ocr': {
      recognizeFromURI: () => Promise.resolve({ result: [] }),
    },
    'image-picker': {
      launchCameraAsync: () => Promise.resolve({ cancelled: true, assets: null }),
      launchImageLibraryAsync: () => Promise.resolve({ cancelled: true, assets: null }),
      requestCameraPermissionsAsync: () => Promise.resolve({ granted: false }),
      requestMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: false }),
    },
    'image-manipulator': {
      manipulateAsync: () => Promise.resolve({ uri: null, width: 0, height: 0 }),
    },
    'secure-store': {
      getItemAsync: () => Promise.resolve(null),
      setItemAsync: () => Promise.resolve(),
      deleteItemAsync: () => Promise.resolve(),
    },
    localization: {
      locale: 'en-US',
      getLocales: () => [{ languageCode: 'en', scriptCode: null, regionCode: 'US' }],
      getCalendars: () => [],
    },
  };

  return stubs[moduleName] || {};
}

/**
 * Initialize all critical modules at startup
 *
 * STRATEGY:
 * - Load critical modules (uses stubs if unavailable)
 * - Log all failures for debugging
 * - Don't block if modules fail (use stubs)
 */
export async function initializeNativeModules() {
  if (NativeModulesState.loaded) return;

  console.debug('[NativeModules] ▶ Initializing native modules...');

  // Critical modules needed for basic functionality
  const criticalModules = ['constants', 'device', 'notifications', 'secure-store'];

  const results = await Promise.allSettled(
    criticalModules.map((moduleName) => loadModule(moduleName))
  );

  // Log results
  results.forEach((result, index) => {
    const moduleName = criticalModules[index];
    if (result.status === 'fulfilled') {
      // Already logged in loadModule
    } else {
      console.warn(`[NativeModules] Module ${moduleName} failed to load: ${result.reason}`);
    }
  });

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

  // Text-to-Speech (via expo-speech)
  async speech() {
    return getModule('speech');
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
