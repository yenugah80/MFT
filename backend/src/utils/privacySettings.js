import { z } from 'zod';

export const PRIVACY_SCHEMA_VERSION = 2;
export const PRIVACY_POLICY_VERSION = '2026-08-29';

const CANONICAL_DEFAULTS = Object.freeze({
  usageAnalytics: true,
  biometricLock: false,
  crossDomainInsights: false,
  contextInInsights: false,
  reflectionInInsights: false,
  sensitiveInsights: false,
  aiWellnessNarration: false,
  weeklyReviewReminder: false,
});

export const PRIVACY_PURPOSE_KEYS = Object.freeze([
  'usageAnalytics',
  'crossDomainInsights',
  'contextInInsights',
  'reflectionInInsights',
  'sensitiveInsights',
  'aiWellnessNarration',
  'weeklyReviewReminder',
]);

export const CROSS_DOMAIN_DEPENDENT_KEYS = Object.freeze([
  'contextInInsights',
  'reflectionInInsights',
  'sensitiveInsights',
  'aiWellnessNarration',
]);

const LEGACY_KEY_MAP = Object.freeze({
  analytics: 'usageAnalytics',
  shareInsights: 'crossDomainInsights',
});

function withLegacyAliases(settings) {
  return {
    ...settings,
    analytics: settings.usageAnalytics,
    shareInsights: settings.crossDomainInsights,
  };
}

export const DEFAULT_PRIVACY_SETTINGS = Object.freeze(withLegacyAliases({
  schemaVersion: PRIVACY_SCHEMA_VERSION,
  ...CANONICAL_DEFAULTS,
}));

const privacyPatchSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(PRIVACY_SCHEMA_VERSION)]).optional(),
  usageAnalytics: z.boolean().optional(),
  biometricLock: z.boolean().optional(),
  crossDomainInsights: z.boolean().optional(),
  contextInInsights: z.boolean().optional(),
  reflectionInInsights: z.boolean().optional(),
  sensitiveInsights: z.boolean().optional(),
  aiWellnessNarration: z.boolean().optional(),
  weeklyReviewReminder: z.boolean().optional(),
  analytics: z.boolean().optional(),
  shareInsights: z.boolean().optional(),
}).strict();

function canonicalizeKnownValues(value) {
  const canonical = {};

  Object.keys(CANONICAL_DEFAULTS).forEach((key) => {
    if (typeof value?.[key] === 'boolean') canonical[key] = value[key];
  });

  Object.entries(LEGACY_KEY_MAP).forEach(([legacyKey, canonicalKey]) => {
    if (typeof value?.[legacyKey] !== 'boolean') return;
    if (typeof value?.[canonicalKey] !== 'boolean') {
      canonical[canonicalKey] = value[legacyKey];
    }
  });

  return canonical;
}

export function parsePrivacyPatch(value) {
  const result = privacyPatchSchema.safeParse(value);
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const suppliedKeys = Object.keys(result.data).filter((key) => key !== 'schemaVersion');
  if (suppliedKeys.length === 0) {
    return {
      success: false,
      issues: [{ path: 'privacy', message: 'At least one privacy setting is required' }],
    };
  }

  for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_KEY_MAP)) {
    if (
      typeof result.data[legacyKey] === 'boolean'
      && typeof result.data[canonicalKey] === 'boolean'
      && result.data[legacyKey] !== result.data[canonicalKey]
    ) {
      return {
        success: false,
        issues: [{
          path: canonicalKey,
          message: `${legacyKey} and ${canonicalKey} cannot disagree`,
        }],
      };
    }
  }

  return {
    success: true,
    data: {
      ...canonicalizeKnownValues(result.data),
      schemaVersion: PRIVACY_SCHEMA_VERSION,
    },
  };
}

export function normalizePrivacySettings(value) {
  const normalized = {
    schemaVersion: PRIVACY_SCHEMA_VERSION,
    ...CANONICAL_DEFAULTS,
    ...canonicalizeKnownValues(
      value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    ),
  };

  return withLegacyAliases(normalized);
}

export function buildStoredPrivacyPatch(patchValue) {
  const storedPatch = {
    ...patchValue,
    schemaVersion: PRIVACY_SCHEMA_VERSION,
  };

  if (typeof patchValue?.usageAnalytics === 'boolean') {
    storedPatch.analytics = patchValue.usageAnalytics;
  }
  if (typeof patchValue?.crossDomainInsights === 'boolean') {
    storedPatch.shareInsights = patchValue.crossDomainInsights;
  }

  return storedPatch;
}

export function resolvePrivacyDependencies(currentValue, patchValue) {
  const current = normalizePrivacySettings(currentValue);
  const crossDomainEnabled = patchValue.crossDomainInsights
    ?? current.crossDomainInsights;

  if (!crossDomainEnabled) {
    const attemptedPurpose = CROSS_DOMAIN_DEPENDENT_KEYS.find(
      (key) => patchValue[key] === true
    );
    if (attemptedPurpose) {
      return {
        success: false,
        issues: [{
          path: attemptedPurpose,
          message: 'Cross-feature patterns must be enabled first',
        }],
      };
    }

    if (patchValue.crossDomainInsights === false) {
      return {
        success: true,
        data: {
          ...patchValue,
          ...Object.fromEntries(CROSS_DOMAIN_DEPENDENT_KEYS.map((key) => [key, false])),
        },
      };
    }
  }

  return { success: true, data: patchValue };
}

export function buildPrivacyAuditChanges(currentValue, patchValue, changedAt = new Date()) {
  const current = normalizePrivacySettings(currentValue);
  const next = normalizePrivacySettings({ ...current, ...patchValue });

  return PRIVACY_PURPOSE_KEYS.flatMap((purposeKey) => {
    if (typeof patchValue?.[purposeKey] !== 'boolean') return [];
    if (current[purposeKey] === next[purposeKey]) return [];

    return [{
      purposeKey,
      schemaVersion: PRIVACY_SCHEMA_VERSION,
      policyVersion: PRIVACY_POLICY_VERSION,
      previousState: current[purposeKey],
      newState: next[purposeKey],
      changedAt,
      revokedAt: current[purposeKey] && !next[purposeKey] ? changedAt : null,
    }];
  });
}
