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
import { eq, sql } from 'drizzle-orm';

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
   * Validates that premium subscription is still active
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

      // Check if user is premium AND subscription hasn't expired
      const now = new Date();
      const isPremiumActive =
        user[0].isPremium &&
        (!user[0].subscriptionEndsAt || user[0].subscriptionEndsAt > now);

      const tier = isPremiumActive ? 'premium' : 'free';

      return {
        tier,
        features: USER_TIERS[tier].features,
        userId,
        subscriptionActive: isPremiumActive,
        subscriptionEndsAt: user[0].subscriptionEndsAt,
      };
    } catch (err) {
      console.error('[PremiumFeatures] Error getting user tier:', err);
      // Fallback to free tier on error
      return { tier: 'free', features: USER_TIERS.free.features };
    }
  }

  /**
   * Determine which parsing engine to use based on user tier
   * STRATEGIC: Respects explicit user consent for GDPR compliance
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

    // Get user tier and check consent
    const userTier = await this.getUserTier(userId);
    const engine = userTier.features.ingredientParsing;

    // CRITICAL: Check explicit consent if OpenAI is intended
    if (engine === 'ai-powered') {
      const hasConsent = await this._hasOpenAIConsent(userId);

      if (!hasConsent) {
        console.log(
          `[PremiumFeatures] Premium user ${userId} lacks OpenAI consent. Falling back to rule-based.`
        );
        return 'rule-based';
      }
    }

    console.log(
      `[PremiumFeatures] Using ${engine} engine for ${userTier.tier} user ${userId}`
    );

    return engine;
  }

  /**
   * Check if user has explicit consent to share data with OpenAI
   * @private
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async _hasOpenAIConsent(userId) {
    try {
      const user = await db.select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId))
        .limit(1);

      if (!user[0]) return false;
      return user[0].openaiDataSharingConsent === true;
    } catch (err) {
      console.error('[PremiumFeatures] Error checking OpenAI consent:', err);
      // Default to NO consent for safety
      return false;
    }
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

      await db.execute(sql`
        INSERT INTO analytics_events (event_name, timestamp, properties, user_id)
        VALUES (
          ${'feature_used'},
          ${new Date()},
          ${JSON.stringify({ feature, tier: userTier.tier, ...metadata })},
          ${userId}
        )
        ON CONFLICT DO NOTHING
      `);
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

    try {
      await db.execute(sql`
        INSERT INTO analytics_events (event_name, timestamp, properties, user_id)
        VALUES (
          ${'premium_api_usage'},
          ${new Date()},
          ${JSON.stringify({ inputTokens, outputTokens, costUsd: cost })},
          ${userId}
        )
      `);
    } catch (err) {
      console.error('[PremiumFeatures] Failed to record billing usage:', err);
    }
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

  /**
   * Set OpenAI data sharing consent for a user
   * GDPR-compliant: Stores explicit consent with timestamp
   * @param {string} userId - User ID
   * @param {boolean} consent - True to allow, false to revoke
   * @returns {Promise<boolean>} - Updated consent status
   */
  async setOpenAIConsent(userId, consent) {
    try {
      const now = new Date();

      // ATOMIC: Wrap update in transaction to ensure consistency
      const result = await db.transaction(async (tx) => {
        return await tx.update(profilesTable)
          .set({
            openaiDataSharingConsent: consent,
            openaiConsentGivenAt: consent ? now : undefined,
            openaiConsentRevokedAt: !consent ? now : undefined,
          })
          .where(eq(profilesTable.userId, userId))
          .returning();
      });

      const timestamp = consent ? now : null;

      console.log('[PremiumFeatures] Consent updated:', {
        userId,
        consent,
        timestamp: timestamp?.toISOString(),
      });

      return result[0]?.openaiDataSharingConsent || false;
    } catch (err) {
      console.error('[PremiumFeatures] Error setting OpenAI consent:', err);
      throw err;
    }
  }

  /**
   * Get user's consent status and history
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Consent status and metadata
   */
  async getOpenAIConsentStatus(userId) {
    try {
      const user = await db.select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId))
        .limit(1);

      if (!user[0]) {
        return { hasConsent: false, consentGivenAt: null };
      }

      return {
        hasConsent: user[0].openaiDataSharingConsent === true,
        consentGivenAt: user[0].openaiConsentGivenAt,
        tier: user[0].isPremium ? 'premium' : 'free',
      };
    } catch (err) {
      console.error('[PremiumFeatures] Error getting consent status:', err);
      return { hasConsent: false, consentGivenAt: null };
    }
  }
}

export const premiumFeaturesService = new PremiumFeaturesService();
export default premiumFeaturesService;
