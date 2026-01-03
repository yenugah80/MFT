/**
 * Production Startup Service
 * Orchestrates all initialization tasks for production-grade startup
 *
 * Handles:
 * - Environment validation
 * - Native module initialization
 * - Feature detection
 * - Permission checking
 * - Crash reporting setup
 * - Analytics initialization
 * - Network connectivity verification
 */

import { initializeNativeModules } from './nativeModulesManager';
import { validateEnvironment, isEnvironmentValid } from './environmentValidation';
import { detectAvailableFeatures } from './featureDetection';
import { checkAllPermissions } from './iosPermissionsHandler';
import { initAnalytics } from './analytics';
import { setupGlobalErrorHandler } from './crashReporting';

/**
 * Startup state
 */
const StartupState = {
  initialized: false,
  stages: {
    environment: { done: false, success: false, duration: 0 },
    nativeModules: { done: false, success: false, duration: 0 },
    features: { done: false, success: false, duration: 0 },
    permissions: { done: false, success: false, duration: 0 },
    errorHandling: { done: false, success: false, duration: 0 },
    analytics: { done: false, success: false, duration: 0 },
  },
  errors: [],
  warnings: [],
};

/**
 * Run complete production startup sequence
 */
export async function runProductionStartup() {
  const startTime = Date.now();

  console.debug('[ProductionStartup] Starting production initialization sequence...');

  try {
    // Stage 1: Environment Validation
    await runStage('environment', async () => {
      validateEnvironment();
      if (!isEnvironmentValid()) {
        throw new Error('Environment validation failed');
      }
    });

    // Stage 2: Native Modules Initialization
    await runStage('nativeModules', async () => {
      await initializeNativeModules();
    });

    // Stage 3: Feature Detection
    await runStage('features', async () => {
      await detectAvailableFeatures();
    });

    // Stage 4: Permission Checking
    await runStage('permissions', async () => {
      await checkAllPermissions();
    });

    // Stage 5: Error Handling Setup
    await runStage('errorHandling', async () => {
      setupGlobalErrorHandler();
    });

    // Stage 6: Analytics Initialization
    await runStage('analytics', async () => {
      await initAnalytics();
    });

    StartupState.initialized = true;

    const totalDuration = Date.now() - startTime;
    logStartupStatus(totalDuration);

    return {
      success: true,
      duration: totalDuration,
      stages: StartupState.stages,
    };
  } catch (error) {
    console.error('[ProductionStartup] Startup failed:', error);
    StartupState.errors.push(error.message);

    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      stages: StartupState.stages,
    };
  }
}

/**
 * Run a single startup stage
 */
async function runStage(stageName, stageFn) {
  const startTime = Date.now();

  try {
    console.debug(`[ProductionStartup] Running stage: ${stageName}...`);
    await stageFn();

    const duration = Date.now() - startTime;
    StartupState.stages[stageName] = {
      done: true,
      success: true,
      duration,
    };

    console.debug(`[ProductionStartup] ✓ ${stageName} completed (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    StartupState.stages[stageName] = {
      done: true,
      success: false,
      duration,
      error: error.message,
    };

    console.error(`[ProductionStartup] ✗ ${stageName} failed:`, error.message);
    throw error;
  }
}

/**
 * Check if startup completed successfully
 */
export function isInitialized() {
  return StartupState.initialized;
}

/**
 * Get startup status report
 */
export function getStartupReport() {
  return {
    initialized: StartupState.initialized,
    timestamp: new Date().toISOString(),
    stages: StartupState.stages,
    errors: StartupState.errors,
    warnings: StartupState.warnings,
  };
}

/**
 * Log startup status
 */
function logStartupStatus(totalDuration) {
  const allSuccess = Object.values(StartupState.stages).every((s) => s.success);

  if (allSuccess) {
    console.debug(`[ProductionStartup] ✓ Production startup completed successfully (${totalDuration}ms)`);
    logStageDurations();
  } else {
    console.error('[ProductionStartup] ✗ Production startup completed with errors');
    logFailedStages();
  }

  if (StartupState.warnings.length > 0) {
    console.warn('[ProductionStartup] Warnings:');
    StartupState.warnings.forEach((w) => console.warn(`  - ${w}`));
  }
}

/**
 * Log duration of each stage
 */
function logStageDurations() {
  console.debug('[ProductionStartup] Stage durations:');
  const durations = Object.entries(StartupState.stages)
    .filter(([, s]) => s.done)
    .map(([name, s]) => `${name}: ${s.duration}ms`)
    .join(', ');
  console.debug(`  ${durations}`);
}

/**
 * Log failed stages
 */
function logFailedStages() {
  const failed = Object.entries(StartupState.stages)
    .filter(([, s]) => !s.success)
    .map(([name, s]) => `${name}: ${s.error}`)
    .join(', ');
  console.error(`  Failed: ${failed}`);
}

/**
 * Production startup checklist for developers
 */
export const PRODUCTION_STARTUP_CHECKLIST = {
  environment: {
    description: 'Environment variables configured',
    critical: true,
    items: [
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY set',
      'EXPO_PUBLIC_API_BASE_URL set to production endpoint',
      'API timeout configured appropriately',
    ],
  },
  permissions: {
    description: 'iOS permissions configured',
    critical: true,
    items: [
      'Camera permission in app.json privacy.plist',
      'Photo library permission in app.json privacy.plist',
      'Microphone permission in app.json privacy.plist (if using voice)',
    ],
  },
  errorHandling: {
    description: 'Error handling configured',
    critical: true,
    items: [
      'Crash reporting endpoint configured',
      'Error boundary wrapping app',
      'Logging service initialized',
    ],
  },
  build: {
    description: 'Build configuration',
    critical: true,
    items: [
      'iOS build profile configured in eas.json',
      'Code signing certificates configured',
      'Bundle identifier correct',
      'Version and build numbers updated',
    ],
  },
  testing: {
    description: 'Pre-production testing',
    critical: true,
    items: [
      'All API endpoints tested',
      'Offline functionality tested',
      'Crash recovery tested',
      'Memory leaks tested with Xcode Instruments',
      'Performance profiled',
    ],
  },
  appstore: {
    description: 'App Store submission',
    critical: true,
    items: [
      'Privacy policy URL configured',
      'App screenshots updated',
      'App description updated for current version',
      'Category and keywords appropriate',
      'All reviewers notes clear',
    ],
  },
};

/**
 * Print production startup checklist
 */
export function printStartupChecklist() {
  console.log('\n📋 PRODUCTION STARTUP CHECKLIST\n');

  Object.entries(PRODUCTION_STARTUP_CHECKLIST).forEach(([category, { description, critical, items }]) => {
    const icon = critical ? '🔴' : '🟡';
    console.log(`${icon} ${category.toUpperCase()}: ${description}`);
    items.forEach((item) => {
      console.log(`   ☐ ${item}`);
    });
    console.log('');
  });
}

export default {
  runProductionStartup,
  isInitialized,
  getStartupReport,
  printStartupChecklist,
};
