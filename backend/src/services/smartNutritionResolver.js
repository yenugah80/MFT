/**
 * Smart Nutrition Resolver
 * OpenAI-first approach with intelligent fallback strategy
 *
 * Strategy:
 * 1. OpenAI estimates nutrition (fast, no rate limits for estimates)
 * 2. If confidence >= 80% → Use OpenAI result
 * 3. If confidence < 80% → Verify with USDA (fallback)
 * 4. Cache results aggressively (24h TTL)
 */

import { openAIClient } from './apiClients/OpenAIClient.js';
import { usdaClient } from './apiClients/USDAClient.js';
import { buildNutritionEstimationPrompt, buildBatchNutritionEstimationPrompt } from './apiClients/prompts/nutritionEstimation.js';
import NodeCache from 'node-cache';

// Aggressive caching (24 hours)
const nutritionCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

class SmartNutritionResolver {
  constructor() {
    this.stats = {
      openaiEstimates: 0,
      usdaVerifications: 0,
      cacheHits: 0,
      totalRequests: 0,
    };
  }

  /**
   * Resolve nutrition for a single food item
   * OpenAI-first with USDA verification for low confidence
   */
  async resolveFood(foodQuery, portion = '1 serving') {
    this.stats.totalRequests++;

    // Check cache first
    const cacheKey = `nutrition:${foodQuery}:${portion}`.toLowerCase();
    const cached = nutritionCache.get(cacheKey);
    if (cached) {
      console.log(`[SmartResolver] Cache hit for "${foodQuery}"`);
      this.stats.cacheHits++;
      return cached;
    }

    try {
      // Step 1: Get OpenAI estimation (fast, always available)
      const openAIResult = await this._getOpenAIEstimation(foodQuery, portion);

      // Step 2: If confidence is high, use it directly
      if (openAIResult.confidence >= 80) {
        console.log(`[SmartResolver] High confidence (${openAIResult.confidence}%) - Using OpenAI estimate for "${foodQuery}"`);
        this.stats.openaiEstimates++;

        const result = {
          ...openAIResult,
          source: 'openai_estimation',
          sourceConfidence: openAIResult.confidence,
          cacheKey,
        };

        nutritionCache.set(cacheKey, result);
        return result;
      }

      // Step 3: Low confidence - verify with USDA if available
      console.log(`[SmartResolver] Low confidence (${openAIResult.confidence}%) - Verifying with USDA for "${foodQuery}"`);

      const usdaResult = await this._getUSDAVerification(foodQuery);

      if (usdaResult) {
        console.log(`[SmartResolver] USDA verification successful for "${foodQuery}"`);
        this.stats.usdaVerifications++;

        const result = {
          ...usdaResult,
          source: 'usda_verified',
          sourceConfidence: 95,
          openaiBackup: openAIResult, // Keep OpenAI estimate as backup
          cacheKey,
        };

        nutritionCache.set(cacheKey, result);
        return result;
      }

      // Step 4: USDA failed - use OpenAI estimate anyway
      console.log(`[SmartResolver] USDA unavailable - Using OpenAI estimate despite low confidence for "${foodQuery}"`);
      this.stats.openaiEstimates++;

      const result = {
        ...openAIResult,
        source: 'openai_estimation_fallback',
        sourceConfidence: openAIResult.confidence,
        warning: 'Estimated values - may not be exact',
        cacheKey,
      };

      nutritionCache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error(`[SmartResolver] Failed to resolve nutrition for "${foodQuery}":`, error.message);
      throw error;
    }
  }

  /**
   * Resolve nutrition for multiple foods (batch)
   * More efficient for meal logging
   */
  async resolveFoodsBatch(foodItems) {
    // Filter out cached items
    const uncachedItems = foodItems.filter(item => {
      const cacheKey = `nutrition:${item.name}:${item.portion || '1 serving'}`.toLowerCase();
      return !nutritionCache.has(cacheKey);
    });

    if (uncachedItems.length === 0) {
      console.log(`[SmartResolver] All ${foodItems.length} items from cache`);
      return foodItems.map(item => {
        const cacheKey = `nutrition:${item.name}:${item.portion || '1 serving'}`.toLowerCase();
        return nutritionCache.get(cacheKey);
      });
    }

    console.log(`[SmartResolver] Batch resolving ${uncachedItems.length} items`);

    try {
      // Use OpenAI batch estimation (single API call for multiple foods)
      const prompt = buildBatchNutritionEstimationPrompt(uncachedItems);

      const response = await openAIClient.chatCompletionJSON(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { model: 'gpt-4o-mini', temperature: 0.3 }
      );

      const estimates = JSON.parse(response.content);

      // Cache results and return
      const results = estimates.map((estimate, i) => {
        const item = uncachedItems[i];
        const cacheKey = `nutrition:${item.name}:${item.portion || '1 serving'}`.toLowerCase();

        const result = {
          ...estimate,
          source: estimate.confidence >= 80 ? 'openai_estimation' : 'openai_estimation_low_confidence',
          sourceConfidence: estimate.confidence,
          originalQuery: item.name,
        };

        nutritionCache.set(cacheKey, result);
        return result;
      });

      return results;

    } catch (error) {
      console.error(`[SmartResolver] Batch resolution failed:`, error.message);
      // Fall back to individual resolution
      return Promise.all(uncachedItems.map(item =>
        this.resolveFood(item.name, item.portion)
      ));
    }
  }

  /**
   * Get OpenAI nutrition estimation
   * @private
   */
  async _getOpenAIEstimation(foodQuery, portion) {
    const prompt = buildNutritionEstimationPrompt(foodQuery, portion);

    const response = await openAIClient.chatCompletionJSON(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.3, // Low temperature for consistent estimates
        maxTokens: 800,
      }
    );

    const estimation = JSON.parse(response.content);

    return {
      foodName: estimation.foodName,
      portionSize: estimation.portionSize,
      servingGrams: estimation.servingGrams,
      confidence: estimation.confidence,
      macros: estimation.macros,
      micros: estimation.micros || {},
      estimationMethod: estimation.estimationMethod,
      needsVerification: estimation.needsVerification,
    };
  }

  /**
   * Get USDA verification (only when needed)
   * @private
   */
  async _getUSDAVerification(foodQuery) {
    try {
      const results = await usdaClient.searchByName(foodQuery);

      if (!results || results.length === 0) {
        return null;
      }

      // Return best match
      const bestMatch = results[0];

      return {
        foodName: bestMatch.description,
        portionSize: bestMatch.servingText,
        servingGrams: bestMatch.gramsPerServing,
        confidence: 95, // USDA is authoritative
        macros: bestMatch.macros,
        micros: bestMatch.micros,
        fdcId: bestMatch.fdcId,
        dataType: bestMatch.dataType,
      };

    } catch (error) {
      console.error(`[SmartResolver] USDA verification failed:`, error.message);
      return null;
    }
  }

  /**
   * Get resolver statistics
   */
  getStats() {
    const cacheStats = nutritionCache.getStats();

    return {
      ...this.stats,
      cacheSize: nutritionCache.keys().length,
      cacheHitRate: this.stats.totalRequests > 0
        ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      openaiUsageRate: this.stats.totalRequests > 0
        ? ((this.stats.openaiEstimates / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      usdaUsageRate: this.stats.totalRequests > 0
        ? ((this.stats.usdaVerifications / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  /**
   * Clear cache (for testing/debugging)
   */
  clearCache() {
    nutritionCache.flushAll();
    console.log('[SmartResolver] Cache cleared');
  }
}

export const smartNutritionResolver = new SmartNutritionResolver();
export default smartNutritionResolver;
