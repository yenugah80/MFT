/**
 * Premium Features Service
 * Manages feature flags, user tiers, and strategic rollout
 *
 * Strategy:
 * - Free tier: Rule-based parsing (regex, fast, cheap)
 * - Premium tier: AI-powered parsing (OpenAI, accurate, expensive)
 * - Enterprise tier: Custom solutions (future)
 */

import { db } from '../config/db.js';
import { profilesTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const FEATURE_FLAGS = {
  // Phase 1: Enable hybrid mode (free regex + premium AI)
  HYBRID_MODE: process.env.HYBRID_FEATURE_MODE === 'true' || false,

  // Phase 2: Use OpenAI for premium users
  PREMIUM_OPENAI: process.env.ENABLE_PREMIUM_OPENAI === 'true' || false,

  // Phase 3: Full AI migration (future)
  FULL_AI_MODE: process.env.FULL_AI_MODE === 'true' || false,

  // Analytics tracking
  TRACK_FEATURE_USAGE: process.env.TRACK_FEATURE_USAGE === 'true' || true,
};

/**
 * User tier definitions
 * Can be extended with more tiers and features
 */
const USER_TIERS = {
  free: {
    name: 'Free',
    features: {
      ingredientParsing: 'rule-based',    // Fast, rule-based extraction
      maxMealsPerDay: 10,
      mealsPerMonth: 300,
      exportData: false,
      aiAccuracy: false,
    },
    monthlyPrice: 0,
  },

  premium: {
    name: 'Premium',
    features: {
      ingredientParsing: 'ai-powered',     // OpenAI-powered extraction
      maxMealsPerDay: 100,
      mealsPerMonth: 3000,
      exportData: true,
      aiAccuracy: true,
      photoLogging: true,
    },
    monthlyPrice: 5,
  },

  enterprise: {
    name: 'Enterprise',
    features: {
      ingredientParsing: 'custom',
      maxMealsPerDay: 1000,
      mealsPerMonth: 100000,
      exportData: true,
      aiAccuracy: true,
      photoLogging: true,
      customModels: true,
      apiAccess: true,
    },
    monthlyPrice: 99,
  },
};

class PremiumFeaturesService {
  constructor() {
    this.metrics = {
      freeUsersConverted: 0,
      premiumAIRequests: 0,
      premiumAICosts: 0,
      conversionRate: 0,
    };
  }

  /**
   * Get user's tier and features
   * @param {string} userId - User ID
   * @returns {Promise<{tier: string, features: object}>}
   */
  async getUserTier(userId) {
    try {
      const user = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId))
        .limit(1);

      if (!user[0]) {
        return { tier: 'free', features: USER_TIERS.free.features };
      }

      // TODO: Link to subscription table in future
      // For now, check if user has premium subscription flag
      const tier = user[0].isPremium ? 'premium' : 'free';

      return {
        tier,
        features: USER_TIERS[tier].features,
        userId,
      };
    } catch (err) {
      console.error('[PremiumFeatures] Error getting user tier:', err);
      // Fallback to free tier on error
      return { tier: 'free', features: USER_TIERS.free.features };
    }
  }

  /**
   * Determine which parsing engine to use based on user tier
   * @param {string} userId - User ID
   * @returns {Promise<string>} - 'rule-based' or 'ai-powered'
   */
  async getParsingEngine(userId) {
    // If full AI mode enabled, use AI for everyone
    if (FEATURE_FLAGS.FULL_AI_MODE) {
      console.log('[PremiumFeatures] Using full AI mode for all users');
      return 'ai-powered';
    }

    // If hybrid mode disabled, use rule-based for everyone
    if (!FEATURE_FLAGS.HYBRID_MODE) {
      return 'rule-based';
    }

    // Get user tier and use accordingly
    const userTier = await this.getUserTier(userId);
    const engine = userTier.features.ingredientParsing;

    console.log(
      `[PremiumFeatures] Using ${engine} engine for ${userTier.tier} user ${userId}`
    );

    return engine;
  }

  /**
   * Check if user has access to a specific feature
   * @param {string} userId - User ID
   * @param {string} feature - Feature name (e.g., 'aiAccuracy', 'photoLogging')
   * @returns {Promise<boolean>}
   */
  async hasFeature(userId, feature) {
    const userTier = await this.getUserTier(userId);
    return userTier.features[feature] === true;
  }

  /**
   * Track feature usage for analytics
   * @param {string} userId - User ID
   * @param {string} feature - Feature name
   * @param {object} metadata - Additional metadata
   */
  async trackFeatureUsage(userId, feature, metadata = {}) {
    if (!FEATURE_FLAGS.TRACK_FEATURE_USAGE) return;

    try {
      const userTier = await this.getUserTier(userId);

      console.log('[PremiumFeatures] Feature Usage:', {
        userId,
        tier: userTier.tier,
        feature,
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      // TODO: Store in analytics table
      // This data will help you understand:
      // - Premium conversion rate
      // - Feature adoption
      // - ROI of OpenAI investment
    } catch (err) {
      console.error('[PremiumFeatures] Error tracking usage:', err);
    }
  }

  /**
   * Calculate cost of OpenAI request
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {number} - Cost in dollars
   */
  calculateCost(inputTokens, outputTokens) {
    const INPUT_COST = 0.000015; // $0.15 per 1M tokens
    const OUTPUT_COST = 0.00006; // $0.60 per 1M tokens
    return (inputTokens * INPUT_COST) + (outputTokens * OUTPUT_COST);
  }

  /**
   * Track premium API usage for cost monitoring
   * @param {string} userId - User ID
   * @param {number} inputTokens - Tokens used
   * @param {number} outputTokens - Tokens generated
   */
  async trackPremiumUsage(userId, inputTokens, outputTokens) {
    const cost = this.calculateCost(inputTokens, outputTokens);

    this.metrics.premiumAIRequests += 1;
    this.metrics.premiumAICosts += cost;

    console.log('[PremiumFeatures] Premium API Usage:', {
      userId,
      inputTokens,
      outputTokens,
      cost: `$${cost.toFixed(4)}`,
      totalCost: `$${this.metrics.premiumAICosts.toFixed(2)}`,
    });

    // TODO: Store in usage tracking table for billing
  }

  /**
   * Get tier pricing info
   * @param {string} tier - Tier name
   * @returns {object} - Tier pricing and features
   */
  getTierInfo(tier = 'free') {
    return USER_TIERS[tier] || USER_TIERS.free;
  }

  /**
   * Get all available tiers
   * @returns {object} - All tiers
   */
  getAllTiers() {
    return USER_TIERS;
  }

  /**
   * Get current metrics
   * @returns {object} - Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      estimatedMonthlyCost: this.metrics.premiumAICosts * 30,
      costPerPremiumUser: this.metrics.premiumAIRequests > 0
        ? (this.metrics.premiumAICosts / this.metrics.premiumAIRequests).toFixed(4)
        : 0,
    };
  }

  /**
   * Check if hybrid mode is enabled
   * @returns {boolean}
   */
  isHybridModeEnabled() {
    return FEATURE_FLAGS.HYBRID_MODE;
  }

  /**
   * Check if full AI mode is enabled
   * @returns {boolean}
   */
  isFullAIModeEnabled() {
    return FEATURE_FLAGS.FULL_AI_MODE;
  }

  /**
   * Get feature flags (admin use only)
   * @returns {object}
   */
  getFeatureFlags() {
    return FEATURE_FLAGS;
  }
}

export const premiumFeaturesService = new PremiumFeaturesService();
export default premiumFeaturesService;
