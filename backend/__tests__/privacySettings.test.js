/* global describe, it, expect */

import {
  buildPrivacyAuditChanges,
  buildStoredPrivacyPatch,
  DEFAULT_PRIVACY_SETTINGS,
  PRIVACY_SCHEMA_VERSION,
  normalizePrivacySettings,
  parsePrivacyPatch,
  resolvePrivacyDependencies,
} from '../src/utils/privacySettings.js';

describe('privacy settings contract', () => {
  it('normalizes legacy settings without losing safe defaults', () => {
    expect(normalizePrivacySettings({ shareInsights: true, analytics: false }))
      .toEqual({
        ...DEFAULT_PRIVACY_SETTINGS,
        crossDomainInsights: true,
        usageAnalytics: false,
        shareInsights: true,
        analytics: false,
      });
  });

  it('keeps compatibility aliases synchronized for older clients', () => {
    expect(buildStoredPrivacyPatch({
      crossDomainInsights: true,
      usageAnalytics: false,
      schemaVersion: PRIVACY_SCHEMA_VERSION,
    })).toMatchObject({
      crossDomainInsights: true,
      shareInsights: true,
      usageAnalytics: false,
      analytics: false,
      schemaVersion: PRIVACY_SCHEMA_VERSION,
    });
  });

  it('canonicalizes legacy patches and rejects conflicting aliases', () => {
    expect(parsePrivacyPatch({ shareInsights: true })).toEqual({
      success: true,
      data: {
        crossDomainInsights: true,
        schemaVersion: PRIVACY_SCHEMA_VERSION,
      },
    });
    expect(parsePrivacyPatch({
      shareInsights: false,
      crossDomainInsights: true,
    }).success).toBe(false);
  });

  it('creates audit rows only for changed consent purposes', () => {
    const changedAt = new Date('2026-08-29T12:00:00.000Z');
    expect(buildPrivacyAuditChanges(
      { usageAnalytics: true, crossDomainInsights: false },
      { usageAnalytics: true, crossDomainInsights: true, schemaVersion: 2 },
      changedAt
    )).toEqual([{
      purposeKey: 'crossDomainInsights',
      schemaVersion: 2,
      policyVersion: '2026-08-29',
      previousState: false,
      newState: true,
      changedAt,
      revokedAt: null,
    }]);
  });

  it('records the revocation timestamp when a purpose is disabled', () => {
    const changedAt = new Date('2026-08-29T13:00:00.000Z');
    expect(buildPrivacyAuditChanges(
      { contextInInsights: true },
      { contextInInsights: false, schemaVersion: 2 },
      changedAt
    )[0]).toMatchObject({
      purposeKey: 'contextInInsights',
      previousState: true,
      newState: false,
      changedAt,
      revokedAt: changedAt,
    });
  });

  it('requires cross-feature patterns before dependent purposes', () => {
    expect(resolvePrivacyDependencies(
      { crossDomainInsights: false },
      { contextInInsights: true, schemaVersion: 2 }
    )).toMatchObject({ success: false });
  });

  it('revokes dependent purposes when cross-feature patterns are disabled', () => {
    expect(resolvePrivacyDependencies(
      { crossDomainInsights: true, contextInInsights: true },
      { crossDomainInsights: false, schemaVersion: 2 }
    )).toEqual({
      success: true,
      data: {
        crossDomainInsights: false,
        contextInInsights: false,
        reflectionInInsights: false,
        sensitiveInsights: false,
        aiWellnessNarration: false,
        schemaVersion: 2,
      },
    });
  });

  it('accepts a field-level patch and attaches the schema version', () => {
    expect(parsePrivacyPatch({ contextInInsights: true })).toEqual({
      success: true,
      data: {
        contextInInsights: true,
        schemaVersion: PRIVACY_SCHEMA_VERSION,
      },
    });
  });

  it('rejects unknown, empty, and incorrectly typed settings', () => {
    expect(parsePrivacyPatch({ futureUnknownSetting: true }).success).toBe(false);
    expect(parsePrivacyPatch({}).success).toBe(false);
    expect(parsePrivacyPatch({ analytics: 'yes' }).success).toBe(false);
  });

  it('falls back field by field when stored JSON is malformed', () => {
    expect(normalizePrivacySettings({
      analytics: false,
      shareInsights: 'invalid',
      unknown: true,
    })).toEqual({
      ...DEFAULT_PRIVACY_SETTINGS,
      usageAnalytics: false,
      analytics: false,
    });
  });
});
