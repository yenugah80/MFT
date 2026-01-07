/**
 * Strategic Food Parser
 * Intelligently routes between rule-based and AI-powered parsing
 *
 * This is the main entry point for all ingredient extraction.
 * It handles:
 * - User tier detection
 * - Cost tracking
 * - Fallback strategies
 * - Performance optimization
 */

import { premiumFeaturesService } from './PremiumFeatures.js';
import { openaiClient } from './apiClients/OpenAIClient.js';
import { FoodService } from './foodService.js';

class StrategicFoodParser {
  constructor() {
    this.stats = {
      totalRequests: 0,
      ruleBasedRequests: 0,
      aiPoweredRequests: 0,
      fallbackRequests: 0,
      totalCost: 0,
    };
  }

  /**
   * Parse food text using optimal strategy
   * Main entry point - use this instead of calling parsing engines directly
   *
   * @param {string} text - User input text
   * @param {string} userId - User ID (for tier detection)
   * @returns {Promise<object>} - Parsed food data with metadata
   */
  async parseFood(text, userId) {
    this.stats.totalRequests += 1;

    try {
      // Step 1: Determine which engine to use
      const engine = await premiumFeaturesService.getParsingEngine(userId);

      // Step 2: Route to appropriate parser
      let result;
      if (engine === 'ai-powered') {
        result = await this._parseWithAI(text, userId);
      } else {
        result = await this._parseWithRules(text, userId);
      }

      // Step 3: Add metadata for frontend
      result.parsingEngine = engine;
      result.userId = userId;

      // Step 4: Track usage for analytics
      await premiumFeaturesService.trackFeatureUsage(userId, 'ingredientParsing', {
        engine,
        itemCount: result.items?.length || 0,
        success: result.success !== false,
      });

      return result;
    } catch (err) {
      console.error('[StrategicFoodParser] Error parsing food:', err);

      // Fallback: Use basic rule-based parsing
      return this._parseFallback(text, userId);
    }
  }

  /**
   * Parse using rule-based approach (fast, cheap, lower accuracy)
   * @private
   */
  async _parseWithRules(text, userId) {
    console.log(`[StrategicFoodParser] Using rule-based parsing for user ${userId}`);
    this.stats.ruleBasedRequests += 1;

    try {
      // Use existing regex-based approach
      const items = await FoodService.parseTextToFoods(text);
      console.log(`[StrategicFoodParser] parseTextToFoods returned ${items?.length || 0} items:`, JSON.stringify(items?.slice(0, 2)));

      return {
        success: true,
        items: items || [],
        engine: 'rule-based',
        confidence: 0.65, // Lower confidence for rule-based
        message: 'Extracted using rule-based parsing (fast, estimated accuracy)',
        accuracy: {
          score: 0.65,
          level: 'estimated',
        },
        cost: 0, // Free tier
      };
    } catch (err) {
      console.error('[StrategicFoodParser] Rule-based parsing failed:', err);
      throw err;
    }
  }

  /**
   * Parse using AI approach (slower, expensive, higher accuracy)
   * @private
   */
  async _parseWithAI(text, userId) {
    console.log(`[StrategicFoodParser] Using AI-powered parsing for user ${userId}`);
    this.stats.aiPoweredRequests += 1;

    try {
      // Use OpenAI for detailed extraction
      const result = await openaiClient.parseTextToFoods(text);

      // Track premium usage for billing
      // Estimate tokens (rough: 1 token ≈ 4 chars)
      const estimatedInputTokens = Math.ceil(text.length / 4);
      const estimatedOutputTokens = Math.ceil(JSON.stringify(result).length / 4);

      await premiumFeaturesService.trackPremiumUsage(
        userId,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      const cost = premiumFeaturesService.calculateCost(
        estimatedInputTokens,
        estimatedOutputTokens
      );

      this.stats.totalCost += cost;

      return {
        success: true,
        items: result.items || [],
        engine: 'ai-powered',
        confidence: 0.92, // Higher confidence for AI
        message: 'Extracted using AI-powered parsing (accurate, slower)',
        accuracy: {
          score: 0.92,
          level: 'precise',
        },
        cost: cost,
        metadata: {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
        },
        ...result, // Include collapsing info, ui_message, etc.
      };
    } catch (err) {
      console.error('[StrategicFoodParser] AI parsing failed:', err);

      // Fallback to rule-based if AI fails
      console.log('[StrategicFoodParser] Falling back to rule-based parsing');
      return this._parseFallback(text, userId);
    }
  }

  /**
   * Fallback parsing when both engines fail
   * @private
   */
  async _parseFallback(text, userId) {
    console.log(`[StrategicFoodParser] Using fallback parsing for user ${userId}`);
    this.stats.fallbackRequests += 1;

    try {
      // Very basic extraction - just return the text as-is
      const words = text.trim().split(/[,;\/\n]+/).filter(w => w.length > 0);

      return {
        success: false,
        items: words.map(w => ({
          name: w.trim(),
          portion: { amount: 1, unit: 'serving' },
          confidence: 0.2,
        })),
        engine: 'fallback',
        confidence: 0.2,
        message: 'Using fallback parsing - please verify manually',
        accuracy: {
          score: 0.2,
          level: 'low',
        },
        cost: 0,
        warning: 'Low confidence results - accuracy may be poor',
      };
    } catch (err) {
      console.error('[StrategicFoodParser] Fallback parsing failed:', err);
      throw new Error('Unable to parse food input');
    }
  }

  /**
   * Get parsing strategy info for a user
   * Useful for debugging and understanding user experience
   */
  async getStrategyInfo(userId) {
    const tier = await premiumFeaturesService.getUserTier(userId);
    const engine = await premiumFeaturesService.getParsingEngine(userId);

    return {
      userId,
      tier: tier.tier,
      engine,
      parsingFeatures: tier.features.ingredientParsing,
      hybridModeEnabled: premiumFeaturesService.isHybridModeEnabled(),
      fullAIModeEnabled: premiumFeaturesService.isFullAIModeEnabled(),
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalRequests = this.stats.totalRequests;
    return {
      ...this.stats,
      ruleBasedPercentage: totalRequests > 0
        ? ((this.stats.ruleBasedRequests / totalRequests) * 100).toFixed(1)
        : 0,
      aiPoweredPercentage: totalRequests > 0
        ? ((this.stats.aiPoweredRequests / totalRequests) * 100).toFixed(1)
        : 0,
      averageCostPerRequest: totalRequests > 0
        ? (this.stats.totalCost / totalRequests).toFixed(4)
        : 0,
      estimatedMonthlyCost: (this.stats.totalCost * 30).toFixed(2),
    };
  }

  /**
   * Reset stats (admin use)
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      ruleBasedRequests: 0,
      aiPoweredRequests: 0,
      fallbackRequests: 0,
      totalCost: 0,
    };
  }
}

export const strategicFoodParser = new StrategicFoodParser();
export default strategicFoodParser;
