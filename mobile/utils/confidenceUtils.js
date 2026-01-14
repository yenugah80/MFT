/**
 * Unified Confidence Badge Utility
 *
 * Standardizes confidence display across all food analysis components:
 * - NutritionCard
 * - FoodItemCard
 * - MealPreviewCard
 *
 * Uses consistent 5-tier system with clear user messaging.
 */

import { SEMANTIC, SEMANTIC_ACTIONS } from '../constants/premiumTheme';

/**
 * Confidence tiers with consistent thresholds
 *
 * 0.90+ = Strong estimate (database match, barcode)
 * 0.75+ = Good estimate (AI with high context)
 * 0.60+ = Reasonable estimate (AI with some uncertainty)
 * 0.40+ = Rough estimate (limited context)
 * <0.40 = Needs adjustment (very uncertain)
 */
export const CONFIDENCE_TIERS = {
  STRONG: { threshold: 0.90, label: 'Strong estimate', shortLabel: 'Strong', icon: '✓✓' },
  GOOD: { threshold: 0.75, label: 'Good estimate', shortLabel: 'Good', icon: '✓' },
  REASONABLE: { threshold: 0.60, label: 'Reasonable estimate', shortLabel: 'OK', icon: '~' },
  ROUGH: { threshold: 0.40, label: 'Rough estimate', shortLabel: 'Rough', icon: '?' },
  NEEDS_ADJUSTMENT: { threshold: 0, label: 'Needs adjustment', shortLabel: 'Check', icon: '!' },
};

/**
 * Get confidence tier based on score
 * @param {number} confidence - Confidence score 0-1
 * @returns {Object} Tier info { threshold, label, shortLabel, icon }
 */
export function getConfidenceTier(confidence) {
  const score = Number(confidence) || 0;

  if (score >= CONFIDENCE_TIERS.STRONG.threshold) return CONFIDENCE_TIERS.STRONG;
  if (score >= CONFIDENCE_TIERS.GOOD.threshold) return CONFIDENCE_TIERS.GOOD;
  if (score >= CONFIDENCE_TIERS.REASONABLE.threshold) return CONFIDENCE_TIERS.REASONABLE;
  if (score >= CONFIDENCE_TIERS.ROUGH.threshold) return CONFIDENCE_TIERS.ROUGH;
  return CONFIDENCE_TIERS.NEEDS_ADJUSTMENT;
}

/**
 * Get confidence badge styling
 * @param {number} confidence - Confidence score 0-1
 * @returns {Object} { color, bg, text, icon, textColor }
 */
export function getConfidenceBadge(confidence) {
  const score = Number(confidence) || 0;
  const tier = getConfidenceTier(score);

  // Color mapping for each tier
  if (score >= 0.90) {
    return {
      color: SEMANTIC.success.base,
      bg: SEMANTIC.success.bg || '#DCFCE7',
      text: tier.label,
      icon: tier.icon,
      textColor: SEMANTIC.success.base,
    };
  }
  if (score >= 0.75) {
    return {
      color: SEMANTIC.info?.base || '#3B82F6',
      bg: SEMANTIC.info?.bg || '#DBEAFE',
      text: tier.label,
      icon: tier.icon,
      textColor: SEMANTIC.info?.base || '#3B82F6',
    };
  }
  if (score >= 0.60) {
    return {
      color: SEMANTIC_ACTIONS.warning || '#F59E0B',
      bg: '#FEF3C7',
      text: tier.label,
      icon: tier.icon,
      textColor: '#92400E',
    };
  }
  if (score >= 0.40) {
    return {
      color: SEMANTIC_ACTIONS.primary || '#F97316',
      bg: '#FFEDD5',
      text: tier.label,
      icon: tier.icon,
      textColor: '#9A3412',
    };
  }
  return {
    color: SEMANTIC_ACTIONS.danger || '#EF4444',
    bg: '#FEE2E2',
    text: tier.label,
    icon: tier.icon,
    textColor: '#991B1B',
  };
}

/**
 * Get simple color for confidence (for compact views)
 * @param {number} confidence - Confidence score 0-1
 * @returns {string} Color hex
 */
export function getConfidenceColor(confidence) {
  const score = Number(confidence) || 0;

  if (score >= 0.75) return SEMANTIC.success.base;
  if (score >= 0.50) return SEMANTIC_ACTIONS.warning || '#F59E0B';
  return SEMANTIC_ACTIONS.danger || '#EF4444';
}

/**
 * Calculate average confidence for multiple items
 * Weights lower confidence items more heavily (conservative approach)
 * @param {Array<{confidence: number}>} items - Items with confidence scores
 * @returns {number} Weighted average confidence
 */
export function calculateAverageConfidence(items) {
  if (!items?.length) return 0.5; // Default middle confidence

  const confidences = items
    .map(item => Number(item.confidence || item.sourceEvidence?.[0]?.confidence) || 0.5)
    .filter(c => c >= 0 && c <= 1);

  if (confidences.length === 0) return 0.5;

  // Simple average (could be weighted in future)
  const sum = confidences.reduce((acc, c) => acc + c, 0);
  return sum / confidences.length;
}

/**
 * Get user-friendly description of what confidence means
 * @param {number} confidence - Confidence score 0-1
 * @returns {string} User-friendly description
 */
export function getConfidenceDescription(confidence) {
  const score = Number(confidence) || 0;

  if (score >= 0.90) {
    return 'Nutrition data comes from a verified database.';
  }
  if (score >= 0.75) {
    return 'Good estimate based on similar foods and preparation.';
  }
  if (score >= 0.60) {
    return 'Reasonable estimate. Actual nutrition may vary by preparation.';
  }
  if (score >= 0.40) {
    return 'Rough estimate. Consider adjusting portions if needed.';
  }
  return 'Very rough estimate. Please review and adjust as needed.';
}
