/**
 * Feature Access Hook
 *
 * Controls access to features based on subscription tier.
 * Use this to gate premium features throughout the app.
 *
 * Usage:
 *   const { hasAccess, requiredTier } = useFeatureAccess('mood_tracking');
 *   if (!hasAccess) return <UpgradePrompt requiredTier={requiredTier} />;
 */

import { useCallback, useMemo } from 'react';
import { useSubscription, TIERS } from '../contexts/SubscriptionContext';
import { trackEvent, Events } from '../services/analytics';

/**
 * Feature definitions with required tiers
 *
 * TIER HIERARCHY:
 * free < basic < premium
 *
 * If you have premium, you have access to everything.
 * If you have basic, you have access to basic + free features.
 */
const FEATURE_TIERS = {
  // ============================================
  // FREE FEATURES
  // ============================================
  manual_logging: TIERS.FREE,
  basic_dashboard: TIERS.FREE,
  daily_calories: TIERS.FREE,
  daily_macros: TIERS.FREE,
  basic_streak: TIERS.FREE,
  limited_history: TIERS.FREE, // 7 days

  // ============================================
  // BASIC FEATURES ($4.79/month)
  // ============================================
  unlimited_photo_ai: TIERS.BASIC,
  voice_logging: TIERS.BASIC,
  barcode_scanning: TIERS.BASIC,
  micronutrients: TIERS.BASIC,
  full_history: TIERS.BASIC, // 30 days
  xp_system: TIERS.BASIC,
  basic_badges: TIERS.BASIC,
  water_tracking: TIERS.BASIC,
  csv_export: TIERS.BASIC,
  ad_free: TIERS.BASIC,
  nutriscore: TIERS.BASIC,
  nova_score: TIERS.BASIC,
  dietary_filtering: TIERS.BASIC,

  // ============================================
  // PREMIUM FEATURES ($7.79/month)
  // ============================================
  mood_tracking: TIERS.PREMIUM,
  mood_insights: TIERS.PREMIUM,
  mood_meal_correlation: TIERS.PREMIUM,
  weekly_reports: TIERS.PREMIUM,
  monthly_reports: TIERS.PREMIUM,
  recommendations: TIERS.PREMIUM,
  unlimited_recommendations: TIERS.PREMIUM,
  streak_freeze: TIERS.PREMIUM,
  all_badges: TIERS.PREMIUM,
  activity_tracking: TIERS.PREMIUM,
  activity_insights: TIERS.PREMIUM,
  meal_comparison: TIERS.PREMIUM,
  unlimited_history: TIERS.PREMIUM, // 90+ days
  recipe_analysis: TIERS.PREMIUM,
  regional_cuisine: TIERS.PREMIUM,
  priority_ai: TIERS.PREMIUM,
  priority_support: TIERS.PREMIUM,
};

// Tier hierarchy for comparison
const TIER_LEVEL = {
  [TIERS.FREE]: 0,
  [TIERS.BASIC]: 1,
  [TIERS.PREMIUM]: 2,
};

/**
 * Check if user has access to a feature
 *
 * @param {string} featureName - The feature to check
 * @returns {{
 *   hasAccess: boolean,
 *   requiredTier: string,
 *   currentTier: string,
 *   isUpgradeNeeded: boolean,
 *   featureName: string
 * }}
 */
export function useFeatureAccess(featureName) {
  const { tier } = useSubscription();

  const result = useMemo(() => {
    const requiredTier = FEATURE_TIERS[featureName] || TIERS.PREMIUM;
    const currentLevel = TIER_LEVEL[tier] || 0;
    const requiredLevel = TIER_LEVEL[requiredTier] || 0;
    const hasAccess = currentLevel >= requiredLevel;

    return {
      hasAccess,
      requiredTier,
      currentTier: tier,
      isUpgradeNeeded: !hasAccess,
      featureName,
    };
  }, [tier, featureName]);

  return result;
}

/**
 * Hook for tracking upgrade prompts
 */
export function useUpgradePrompt() {
  const { tier } = useSubscription();

  const showUpgradePrompt = useCallback((featureName, location) => {
    trackEvent(Events.UPGRADE_PROMPT_SHOWN, {
      feature: featureName,
      location,
      current_tier: tier,
      required_tier: FEATURE_TIERS[featureName] || TIERS.PREMIUM,
    });
  }, [tier]);

  const trackUpgradeClick = useCallback((featureName, location) => {
    trackEvent(Events.UPGRADE_PROMPT_CLICKED, {
      feature: featureName,
      location,
      current_tier: tier,
    });
  }, [tier]);

  const trackUpgradeDismiss = useCallback((featureName, location) => {
    trackEvent(Events.UPGRADE_PROMPT_DISMISSED, {
      feature: featureName,
      location,
      current_tier: tier,
    });
  }, [tier]);

  return {
    showUpgradePrompt,
    trackUpgradeClick,
    trackUpgradeDismiss,
  };
}

/**
 * Get display name for a tier
 */
export function getTierDisplayName(tier) {
  const names = {
    [TIERS.FREE]: 'Free',
    [TIERS.BASIC]: 'Basic',
    [TIERS.PREMIUM]: 'Premium',
  };
  return names[tier] || 'Unknown';
}

/**
 * Get all features for a tier
 */
export function getFeaturesForTier(tier) {
  return Object.entries(FEATURE_TIERS)
    .filter(([_, requiredTier]) => requiredTier === tier)
    .map(([featureName]) => featureName);
}

/**
 * Feature names for display
 */
export const FEATURE_DISPLAY_NAMES = {
  // Free
  manual_logging: 'Manual Food Logging',
  basic_dashboard: 'Basic Dashboard',
  daily_calories: 'Daily Calorie Tracking',
  daily_macros: 'Macro Tracking',
  basic_streak: 'Streak Counter',
  limited_history: '7-Day History',

  // Basic
  unlimited_photo_ai: 'Unlimited AI Photo Logging',
  voice_logging: 'Voice Logging',
  barcode_scanning: 'Barcode Scanning',
  micronutrients: 'Micronutrient Tracking',
  full_history: '30-Day History',
  xp_system: 'XP & Leveling',
  basic_badges: '15 Achievements',
  water_tracking: 'Hydration Tracking',
  csv_export: 'Data Export (CSV)',
  ad_free: 'Ad-Free Experience',
  nutriscore: 'NutriScore Ratings',
  nova_score: 'NOVA Score',
  dietary_filtering: 'Dietary Filters',

  // Premium
  mood_tracking: 'Mood Tracking',
  mood_insights: 'Mood Insights',
  mood_meal_correlation: 'Mood-Meal AI Correlation',
  weekly_reports: 'Weekly Reports',
  monthly_reports: 'Monthly Reports',
  recommendations: 'AI Recommendations',
  unlimited_recommendations: 'Unlimited Recommendations',
  streak_freeze: 'Streak Protection',
  all_badges: '30+ Achievements',
  activity_tracking: 'Activity Tracking',
  activity_insights: 'Activity Insights',
  meal_comparison: 'Meal Comparison',
  unlimited_history: '90-Day History',
  recipe_analysis: 'Recipe Analysis',
  regional_cuisine: 'Regional Cuisine AI',
  priority_ai: 'Priority AI Processing',
  priority_support: 'Priority Support',
};

export default useFeatureAccess;
