/* global describe, it, expect */

import {
  buildProfileExportPayload,
  CORE_WELLNESS_EXPORT_COLLECTIONS,
} from '../src/utils/profileDataExport.js';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { profilesTable } from '../src/db/schema.js';

const collections = {
  foodLogs: [{ id: 1, name: 'Lunch' }],
  waterLogs: [{ id: 2, amountLiters: '0.250' }],
  moodLogs: [{ id: 3, mood: 'calm' }],
  activityLogs: [{ id: 4, type: 'walking' }],
  sleepLogs: [{ id: 5, durationMinutes: 460 }],
  stressLogs: [{ id: 6, level: 4 }],
  weightHistory: [{ id: 7, weightKg: '72.5' }],
  privacyConsentHistory: [{ id: 8, purposeKey: 'contextInInsights', newState: true }],
};

describe('profile data export', () => {
  it('keeps every core wellness domain in the export registry', () => {
    expect(CORE_WELLNESS_EXPORT_COLLECTIONS.map(({ key }) => key)).toEqual([
      'foodLogs',
      'waterLogs',
      'moodLogs',
      'activityLogs',
      'sleepLogs',
      'stressLogs',
      'weightHistory',
      'privacyConsentHistory',
    ]);
  });

  it('requires every registered source to belong to the user and cascade on account deletion', () => {
    CORE_WELLNESS_EXPORT_COLLECTIONS.forEach(({ key, table }) => {
      expect(table.userId).toBeDefined();
      const userCascade = getTableConfig(table).foreignKeys.some((foreignKey) => {
        const reference = foreignKey.reference();
        return foreignKey.onDelete === 'cascade'
          && reference.foreignTable === profilesTable
          && reference.columns.includes(table.userId);
      });
      expect({ key, userCascade }).toEqual({ key, userCascade: true });
    });
  });

  it('exports sleep and stress with counts and removes internal row IDs', () => {
    const payload = buildProfileExportPayload({
      exportedAt: '2026-08-28T12:00:00.000Z',
      userId: 'user_test',
      profile: { id: 99, createdAt: '2026-01-01T00:00:00.000Z' },
      dietaryPreferences: { id: 98, preferences: ['vegetarian'] },
      nutritionGoals: { id: 97, waterLiters: '2.5' },
      gamification: { id: 96, level: 2 },
      accountSettings: { id: 95, privacy: { analytics: true } },
      collections,
    });

    expect(payload.schemaVersion).toBe(3);
    expect(payload.sleepLogs).toEqual([{ durationMinutes: 460 }]);
    expect(payload.stressLogs).toEqual([{ level: 4 }]);
    expect(payload.weightHistory).toEqual([{ weightKg: '72.5' }]);
    expect(payload.privacyConsentHistory).toEqual([{
      purposeKey: 'contextInInsights',
      newState: true,
    }]);
    expect(payload.summary).toMatchObject({
      totalFoodLogs: 1,
      totalWaterLogs: 1,
      totalMoodLogs: 1,
      totalActivityLogs: 1,
      totalSleepLogs: 1,
      totalStressLogs: 1,
      totalWeightRecords: 1,
      totalPrivacyConsentChanges: 1,
    });
    expect(payload.profile).not.toHaveProperty('id');
  });

  it('fails closed instead of silently producing an incomplete export', () => {
    expect(() => buildProfileExportPayload({
      userId: 'user_test',
      collections: { ...collections, sleepLogs: undefined },
    })).toThrow('Incomplete wellness export: missing sleepLogs');
  });
});
