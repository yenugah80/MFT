/**
 * Health Platform Service — Mobile Layer
 *
 * Provides step count, activity energy, and weight data from
 * Apple HealthKit (iOS) and Google Health Connect (Android).
 *
 * Phase 1 (current): Stub implementation — returns empty data with
 *   isConnected: false so the UI can render a "Connect" prompt.
 *
 * Phase 2: Install `react-native-health` (iOS) and
 *   `react-native-health-connect` (Android), uncomment the platform
 *   blocks below, and the service will auto-activate.
 *
 * The backend accepts POST /api/health/sync with the payload this
 * service produces — that endpoint is fully implemented and ready.
 */

import { Platform } from 'react-native';
import apiClient from './apiClient';

// ─── Phase 2 stubs ────────────────────────────────────────────────────────────
// When the native packages are installed:
//   import AppleHealthKit from 'react-native-health';
//   import { initialize, requestPermission, readRecords } from 'react-native-health-connect';

const HEALTH_PACKAGE_AVAILABLE = false; // flip to true after installing native SDK

// ─── Permission config (ready for native SDK) ─────────────────────────────────

const IOS_PERMISSIONS = {
  permissions: {
    read: [
      'StepCount',
      'ActiveEnergyBurned',
      'BasalEnergyBurned',
      'DistanceWalkingRunning',
      'HeartRate',
      'BodyMass',
      'SleepAnalysis',
      'FlightsClimbed',
    ],
    write: [
      'DietaryEnergyConsumed',
      'DietaryProtein',
      'DietaryCarbohydrates',
      'DietaryFatTotal',
      'DietaryWater',
      'BodyMass',
    ],
  },
};

const ANDROID_PERMISSIONS = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_TOTAL_CALORIES_BURNED',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_SLEEP',
  'android.permission.health.WRITE_NUTRITION',
  'android.permission.health.WRITE_HYDRATION',
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether the health platform integration is available on this device.
 */
export function isHealthAvailable() {
  return HEALTH_PACKAGE_AVAILABLE && (Platform.OS === 'ios' || Platform.OS === 'android');
}

/**
 * Request HealthKit / Health Connect permissions.
 * Returns true if granted; false if unavailable or denied.
 */
export async function requestHealthPermissions() {
  if (!isHealthAvailable()) return false;

  // iOS — Phase 2:
  // if (Platform.OS === 'ios') {
  //   return new Promise(resolve => {
  //     AppleHealthKit.initHealthKit(IOS_PERMISSIONS, err => resolve(!err));
  //   });
  // }

  // Android — Phase 2:
  // if (Platform.OS === 'android') {
  //   const initialized = await initialize();
  //   if (!initialized) return false;
  //   const granted = await requestPermission(ANDROID_PERMISSIONS.map(p => ({ accessType: 'read', recordType: p })));
  //   return granted.length > 0;
  // }

  return false;
}

/**
 * Fetch today's step count from the health platform.
 * @returns {Promise<number>} Steps today, or 0 if unavailable.
 */
export async function getTodaySteps() {
  if (!isHealthAvailable()) return 0;

  // iOS — Phase 2:
  // if (Platform.OS === 'ios') {
  //   return new Promise(resolve => {
  //     const options = { startDate: new Date().setHours(0,0,0,0), endDate: new Date().toISOString() };
  //     AppleHealthKit.getStepCount(options, (err, results) => resolve(err ? 0 : results.value || 0));
  //   });
  // }

  // Android — Phase 2:
  // if (Platform.OS === 'android') {
  //   const midnight = new Date(); midnight.setHours(0,0,0,0);
  //   const records = await readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: midnight.toISOString(), endTime: new Date().toISOString() } });
  //   return records.reduce((sum, r) => sum + (r.count || 0), 0);
  // }

  return 0;
}

/**
 * Fetch today's active calorie burn.
 * @returns {Promise<number>} kcal burned today, or 0 if unavailable.
 */
export async function getTodayActiveCalories() {
  if (!isHealthAvailable()) return 0;

  // iOS — Phase 2:
  // if (Platform.OS === 'ios') {
  //   return new Promise(resolve => {
  //     const options = { startDate: new Date().setHours(0,0,0,0), endDate: new Date().toISOString(), includeManuallyAdded: true };
  //     AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
  //       if (err) return resolve(0);
  //       const total = results.reduce((sum, r) => sum + (r.value || 0), 0);
  //       resolve(Math.round(total));
  //     });
  //   });
  // }

  return 0;
}

/**
 * Fetch last recorded body weight from the health platform.
 * @returns {Promise<number|null>} weight in kg, or null.
 */
export async function getLatestWeight() {
  if (!isHealthAvailable()) return null;

  // iOS — Phase 2:
  // if (Platform.OS === 'ios') {
  //   return new Promise(resolve => {
  //     AppleHealthKit.getLatestWeight({ unit: 'gram' }, (err, results) => {
  //       if (err || !results?.value) return resolve(null);
  //       resolve(Math.round(results.value / 1000 * 10) / 10); // grams → kg
  //     });
  //   });
  // }

  return null;
}

/**
 * Sync today's health data to the MFT backend.
 * Reads steps + active calories from the health platform and posts them.
 * No-ops gracefully when health is unavailable.
 */
export async function syncHealthDataToBackend() {
  if (!isHealthAvailable()) return { synced: false, reason: 'not_available' };

  try {
    const [steps, activeCalories, weightKg] = await Promise.all([
      getTodaySteps(),
      getTodayActiveCalories(),
      getLatestWeight(),
    ]);

    const payload = {
      platform: Platform.OS === 'ios' ? 'healthkit' : 'health_connect',
      date: new Date().toISOString().slice(0, 10),
      steps,
      activeCaloriesBurned: activeCalories,
      weightKg,
    };

    await apiClient.post('/health/sync', payload);
    return { synced: true, steps, activeCalories, weightKg };
  } catch (err) {
    console.warn('[HealthPlatformService] Sync failed:', err.message);
    return { synced: false, reason: err.message };
  }
}

/**
 * Write today's nutrition log to the health platform (HealthKit write).
 * @param {{ calories: number, protein: number, carbs: number, fat: number, water: number }} nutrition
 */
export async function writeNutritionToHealth(nutrition) {
  if (!isHealthAvailable()) return false;

  // iOS — Phase 2:
  // if (Platform.OS === 'ios') {
  //   const options = {
  //     foodName: 'MFT Daily Nutrition',
  //     calories: nutrition.calories || 0,
  //     protein: nutrition.protein || 0,
  //     carbohydrates: nutrition.carbs || 0,
  //     totalFat: nutrition.fat || 0,
  //     water: (nutrition.water || 0) / 1000, // ml → L
  //     metadata: { HKWasUserEntered: true },
  //   };
  //   return new Promise(resolve => AppleHealthKit.saveFood(options, err => resolve(!err)));
  // }

  return false;
}

export default {
  isHealthAvailable,
  requestHealthPermissions,
  getTodaySteps,
  getTodayActiveCalories,
  getLatestWeight,
  syncHealthDataToBackend,
  writeNutritionToHealth,
};
