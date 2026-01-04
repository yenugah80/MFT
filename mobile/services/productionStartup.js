/**
 * Production Startup Service
 * Orchestrates all initialization tasks for production-grade startup
 *
 * ARCHITECTURE:
 * - Critical stages (environment, errorHandling): MUST succeed → hard fail
 * - Important stages (nativeModules, features): CAN degrade gracefully
 * - Non-critical stages (analytics): FAIL SILENTLY → log only
 *
 * Timeout Protection:
 * - Each async stage has 10s timeout to prevent hangs
 * - Failed stages are logged but don't block startup
 *
 * Handles:
 * - Environment validation with actual connectivity checks
 * - Native module initialization with timeouts
 * - Feature detection with corrected logic
 * - Crash reporting setup
 * - Analytics initialization (non-blocking)
 */

import { initializeNativeModules } from './nativeModulesManager';
import { validateEnvironment, isEnvironmentValid, assertEnvironmentValid } from './environmentValidation';
import { detectAvailableFeatures } from './featureDetection';
import { initAnalytics } from './analytics';
import { setupGlobalErrorHandler } from './crashReporting';

// Stage severity levels
const StageSeverity = {
  CRITICAL: 'critical',    // Must succeed or startup fails
  IMPORTANT: 'important',  // Failure degrades features but app runs
  OPTIONAL: 'optional',    // Failure is logged, app runs normally
};

/**
 * Startup state - reset on each initialization
 */
function createStartupState() {
  return {
    initialized: false,
    startTime: 0,
    stages: {
      environment: { done: false, success: false, duration: 0, severity: StageSeverity.CRITICAL },
      errorHandling: { done: false, success: false, duration: 0, severity: StageSeverity.CRITICAL },
      nativeModules: { done: false, success: false, duration: 0, severity: StageSeverity.IMPORTANT },
      features: { done: false, success: false, duration: 0, severity: StageSeverity.IMPORTANT },
      analytics: { done: false, success: false, duration: 0, severity: StageSeverity.OPTIONAL },
    },
    criticalFailures: [],
    degradedFeatures: [],
    warnings: [],
  };
}

let StartupState = createStartupState();

/**
 * Run complete production startup sequence
 *
 * STRATEGY:
 * 1. Reset state (support re-initialization)
 * 2. Run critical stages → throw if fail
 * 3. Run important stages → log if fail
 * 4. Run optional stages → fail silently
 * 5. Mark initialized only if critical stages succeed
 */
export async function runProductionStartup() {
  // Reset state for re-initialization support
  StartupState = createStartupState();
  StartupState.startTime = Date.now();

  console.debug('[ProductionStartup] ▶ Starting production initialization sequence...');

  try {
    // CRITICAL: Stage 1 - Environment Validation (hard fail required)
    await runStage('environment', async () => {
      validateEnvironment();
      assertEnvironmentValid(); // Throws if invalid
    }, StageSeverity.CRITICAL);

    // CRITICAL: Stage 2 - Error Handling (must be first after env validation)
    await runStage('errorHandling', () => {
      setupGlobalErrorHandler();
    }, StageSeverity.CRITICAL);

    // IMPORTANT: Stage 3 - Native Modules (fail degrades features)
    await runStage('nativeModules', async () => {
      await initializeNativeModules();
    }, StageSeverity.IMPORTANT);

    // IMPORTANT: Stage 4 - Feature Detection (fail degrades features)
    await runStage('features', async () => {
      await detectAvailableFeatures();
    }, StageSeverity.IMPORTANT);

    // OPTIONAL: Stage 5 - Analytics (non-critical, fail silently)
    await runStage('analytics', async () => {
      await initAnalytics();
    }, StageSeverity.OPTIONAL);

    // Mark as initialized (only reached if critical stages passed)
    StartupState.initialized = true;

    const totalDuration = Date.now() - StartupState.startTime;
    logStartupStatus(totalDuration);

    return {
      success: true,
      duration: totalDuration,
      stages: StartupState.stages,
      criticalFailures: StartupState.criticalFailures,
      degradedFeatures: StartupState.degradedFeatures,
    };
  } catch (error) {
    const totalDuration = Date.now() - StartupState.startTime;

    console.error('[ProductionStartup] ✗ STARTUP FAILED - Critical stage error:', error.message);
    StartupState.criticalFailures.push(error.message);

    return {
      success: false,
      error: error.message,
      duration: totalDuration,
      stages: StartupState.stages,
      criticalFailures: StartupState.criticalFailures,
      degradedFeatures: StartupState.degradedFeatures,
    };
  }
}

/**
 * Run a single startup stage with timeout protection
 *
 * TIMEOUT STRATEGY:
 * - 10 second timeout on all async operations
 * - Prevents app hang if module load stalls
 * - Timeout is critical failure
 */
async function runStage(stageName, stageFn, severity = StageSeverity.IMPORTANT) {
  const startTime = Date.now();
  const STAGE_TIMEOUT = 10000; // 10 seconds

  try {
    console.debug(`[ProductionStartup] Running stage: ${stageName}...`);

    // Wrap with timeout protection
    await Promise.race([
      Promise.resolve(stageFn()),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Stage timeout after ${STAGE_TIMEOUT}ms`)),
          STAGE_TIMEOUT
        )
      ),
    ]);

    const duration = Date.now() - startTime;
    StartupState.stages[stageName] = {
      done: true,
      success: true,
      duration,
      severity,
    };

    console.debug(`[ProductionStartup]   ✓ ${stageName} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error?.message || String(error);

    StartupState.stages[stageName] = {
      done: true,
      success: false,
      duration,
      severity,
      error: errorMsg,
    };

    // Handle based on severity
    if (severity === StageSeverity.CRITICAL) {
      console.error(`[ProductionStartup]   ✗ CRITICAL ${stageName} failed: ${errorMsg}`);
      StartupState.criticalFailures.push(`${stageName}: ${errorMsg}`);
      throw error; // Re-throw to fail startup
    } else if (severity === StageSeverity.IMPORTANT) {
      console.warn(`[ProductionStartup]   ⚠ DEGRADED ${stageName} failed: ${errorMsg}`);
      StartupState.degradedFeatures.push(`${stageName}: ${errorMsg}`);
      // Don't throw - let startup continue with degraded features
    } else {
      // OPTIONAL stage
      console.debug(`[ProductionStartup]   ℹ OPTIONAL ${stageName} skipped: ${errorMsg}`);
      // Don't throw - log and continue
    }
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
 * Log comprehensive startup status
 */
function logStartupStatus(totalDuration) {
  const allSuccess = Object.values(StartupState.stages).every((s) => s.success);
  const hasDegraded = StartupState.degradedFeatures.length > 0;

  if (allSuccess) {
    console.debug(`[ProductionStartup] ✓ Production startup completed successfully in ${totalDuration}ms`);
  } else if (StartupState.initialized) {
    console.warn(`[ProductionStartup] ⚠ Startup completed with degraded features in ${totalDuration}ms`);
    console.warn('[ProductionStartup] Degraded Features:');
    StartupState.degradedFeatures.forEach((d) => console.warn(`  - ${d}`));
  } else {
    console.error(`[ProductionStartup] ✗ Startup FAILED in ${totalDuration}ms`);
    console.error('[ProductionStartup] Critical Failures:');
    StartupState.criticalFailures.forEach((f) => console.error(`  - ${f}`));
  }

  logStageDurations();

  if (StartupState.warnings.length > 0) {
    console.warn('[ProductionStartup] ⚠ Warnings:');
    StartupState.warnings.forEach((w) => console.warn(`  - ${w}`));
  }
}

/**
 * Log duration of each stage (formatted for readability)
 */
function logStageDurations() {
  console.debug('[ProductionStartup] Stage Timings:');
  Object.entries(StartupState.stages).forEach(([name, stage]) => {
    if (stage.done) {
      const status = stage.success ? '✓' : '✗';
      console.debug(`  ${status} ${name.padEnd(15)} ${String(stage.duration).padStart(4)}ms`);
    }
  });
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
