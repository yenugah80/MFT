import {
  activityLogTable,
  foodLogTable,
  moodLogTable,
  privacyConsentAuditTable,
  sleepLogTable,
  stressLogTable,
  waterLogTable,
  weightHistoryTable,
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

export function sanitizeExportRecord(record) {
  if (!record) return null;
  const portableRecord = { ...record };
  delete portableRecord.id;
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
