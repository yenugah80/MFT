import {
  activityLogTable,
  foodLogTable,
  moodLogTable,
  privacyConsentAuditTable,
  sleepLogTable,
  stressLogTable,
  waterLogTable,
  weightHistoryTable,
  profilesTable,
  dietaryPreferencesTable,
  nutritionGoalsTable,
  gamificationTable,
  accountSettingsTable,
} from '../db/schema.js';

export const CORE_WELLNESS_EXPORT_COLLECTIONS = Object.freeze([
  Object.freeze({ key: 'foodLogs', summaryKey: 'totalFoodLogs', table: foodLogTable }),
  Object.freeze({ key: 'waterLogs', summaryKey: 'totalWaterLogs', table: waterLogTable }),
  Object.freeze({ key: 'moodLogs', summaryKey: 'totalMoodLogs', table: moodLogTable }),
  Object.freeze({ key: 'activityLogs', summaryKey: 'totalActivityLogs', table: activityLogTable }),
  Object.freeze({ key: 'sleepLogs', summaryKey: 'totalSleepLogs', table: sleepLogTable }),
  Object.freeze({ key: 'stressLogs', summaryKey: 'totalStressLogs', table: stressLogTable }),
  Object.freeze({ key: 'weightHistory', summaryKey: 'totalWeightRecords', table: weightHistoryTable }),
  Object.freeze({ key: 'privacyConsentHistory', summaryKey: 'totalPrivacyConsentChanges', table: privacyConsentAuditTable }),
]);

// Single-record sections (one row per user, not a log collection), with
// their table reference so an empty CSV can still emit real column headers
// instead of a 0-byte file.
export const SINGLE_RECORD_EXPORT_SECTIONS = Object.freeze([
  Object.freeze({ key: 'profile', label: 'Profile', table: profilesTable }),
  Object.freeze({ key: 'dietaryPreferences', label: 'Dietary Preferences', table: dietaryPreferencesTable }),
  Object.freeze({ key: 'nutritionGoals', label: 'Nutrition Goals', table: nutritionGoalsTable }),
  Object.freeze({ key: 'gamification', label: 'Gamification', table: gamificationTable }),
  Object.freeze({ key: 'accountSettings', label: 'Account Settings', table: accountSettingsTable }),
]);

// Fields that must never leave the server in a user-facing export: internal
// row ids, and device push tokens (not "credentials" in the login sense, but
// a leaked token lets someone send fake pushes to that device — no reason to
// hand it to the user as a downloadable file).
export const EXCLUDED_EXPORT_FIELDS = ['id', 'expoPushToken', 'fcmToken'];

export function sanitizeExportRecord(record) {
  if (!record) return null;
  const portableRecord = { ...record };
  for (const field of EXCLUDED_EXPORT_FIELDS) {
    delete portableRecord[field];
  }
  return portableRecord;
}

export function buildProfileExportPayload({
  exportedAt = new Date().toISOString(),
  userId,
  profile,
  dietaryPreferences,
  nutritionGoals,
  gamification,
  accountSettings,
  collections,
}) {
  const missingKeys = CORE_WELLNESS_EXPORT_COLLECTIONS
    .map(({ key }) => key)
    .filter((key) => !Array.isArray(collections?.[key]));

  if (missingKeys.length > 0) {
    throw new Error(`Incomplete wellness export: missing ${missingKeys.join(', ')}`);
  }

  const portableCollections = {};
  const summary = {
    accountCreated: profile?.createdAt || null,
  };

  CORE_WELLNESS_EXPORT_COLLECTIONS.forEach(({ key, summaryKey }) => {
    portableCollections[key] = collections[key].map(sanitizeExportRecord);
    summary[summaryKey] = collections[key].length;
  });

  return {
    schemaVersion: 3,
    exportedAt,
    userId,
    profile: sanitizeExportRecord(profile),
    dietaryPreferences: sanitizeExportRecord(dietaryPreferences),
    nutritionGoals: sanitizeExportRecord(nutritionGoals),
    gamification: sanitizeExportRecord(gamification),
    accountSettings: sanitizeExportRecord(accountSettings),
    ...portableCollections,
    summary,
  };
}
