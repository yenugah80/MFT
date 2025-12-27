/**
 * Smart Nutrition Resolver
 * OpenAI-first approach with intelligent fallback strategy
 *
 * Strategy:
 * 1. OpenAI estimates nutrition (fast, no rate limits for estimates)
 * 2. If confidence >= 80% → Use OpenAI result
 * 3. If confidence < 80% → Verify with USDA (fallback) [CURRENTLY DISABLED - validating OpenAI-only]
 * 4. Cache results aggressively (24h TTL)
 *
 * USDA Verification: Disabled by default (set ENABLE_USDA_VERIFICATION=true to enable)
 * Current strategy: Trust OpenAI entirely, monitor accuracy, re-enable USDA later if needed
 */

import { usdaClient } from './apiClients/USDAClient.js';
import { buildNutritionEstimationPrompt, buildBatchNutritionEstimationPrompt } from './apiClients/prompts/nutritionEstimation.js';
import { safeJSONCompletion, getCacheKey, JSONParseError, OpenAIValidationError } from './apiClients/SafeOpenAIWrapper.js';
import NodeCache from 'node-cache';

// Feature flag for USDA verification (disabled by default)
const ENABLE_USDA_VERIFICATION = process.env.ENABLE_USDA_VERIFICATION === 'true';

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
   * OpenAI-first with optional USDA verification
   *
   * STRATEGY: Trust OpenAI for ingredient preservation (spinach stays spinach!)
   * Only use USDA for generic foods where exact nutrient data is critical
   */
  async resolveFood(foodQuery, portion = '1 serving') {
    this.stats.totalRequests++;

    // Check cache first - use deterministic cache key
    const cacheKey = getCacheKey('nutrition', foodQuery, portion);
    const cached = nutritionCache.get(cacheKey);
    if (cached) {
      console.log(`[SmartResolver] Cache hit for "${foodQuery}"`);
      this.stats.cacheHits++;
      return cached;
    }

    try {
      // Step 1: Get OpenAI estimation (fast, always available, preserves ingredients)
      const openAIResult = await this._getOpenAIEstimation(foodQuery, portion);

      // Step 2: Check if this is an ingredient-specific food (protein/vegetable/grain)
      const hasSpecificIngredient = this._hasSpecificIngredient(foodQuery);

      // Step 3: Decide whether to trust OpenAI or verify with USDA
      // For ingredient-specific foods: ALWAYS trust OpenAI (prevents "spinach" → "beef" errors)
      // For generic foods: Use USDA if confidence < 60% (when USDA verification enabled)

      // FEATURE FLAG: USDA verification disabled by default (validating OpenAI-only accuracy)
      const shouldTrustOpenAI = !ENABLE_USDA_VERIFICATION || hasSpecificIngredient || openAIResult.confidence >= 60;

      if (shouldTrustOpenAI) {
        const reason = !ENABLE_USDA_VERIFICATION
          ? 'USDA verification disabled (OpenAI-only mode)'
          : hasSpecificIngredient
          ? 'ingredient-specific food (preserving ingredients)'
          : `confidence ${openAIResult.confidence}% >= 60%`;

        console.log(`[SmartResolver] ✅ Using OpenAI - ${reason} for "${foodQuery}"`);
        this.stats.openaiEstimates++;

        const result = {
          ...openAIResult,
          source: 'openai_estimation',
          sourceConfidence: openAIResult.confidence,
          reason: `OpenAI estimation (${reason})`,
          limitation: openAIResult.confidence < 80 ? 'Estimated values - may vary by brand/preparation' : null,
          components: openAIResult.components || [], // Pass through components
          isComplex: openAIResult.isComplex || false,
          cacheKey,
        };

        nutritionCache.set(cacheKey, result);
        return result;
      }

      // Step 4: Low confidence + generic food - try USDA verification
      // NOTE: This code path only executes when ENABLE_USDA_VERIFICATION=true
      console.log(`[SmartResolver] 🔍 Low confidence (${openAIResult.confidence}%) for generic food - Checking USDA for "${foodQuery}"`);

      const usdaResult = await this._getUSDAVerification(foodQuery);

      if (usdaResult) {
        console.log(`[SmartResolver] ✅ USDA verification successful for "${foodQuery}"`);
        this.stats.usdaVerifications++;

        const result = {
          ...usdaResult,
          source: 'usda_verified',
          sourceConfidence: 95,
          openaiBackup: openAIResult, // Keep OpenAI estimate as backup (includes components)
          limitation: 'USDA data - may not match your specific brand',
          components: [], // USDA doesn't have component breakdown
          isComplex: false,
          cacheKey,
        };

        nutritionCache.set(cacheKey, result);
        return result;
      }

      // Step 5: USDA failed - use OpenAI estimate
      console.log(`[SmartResolver] ⚠️ USDA unavailable - Using OpenAI estimate for "${foodQuery}"`);
      this.stats.openaiEstimates++;

      const result = {
        ...openAIResult,
        source: 'openai_estimation_fallback',
        sourceConfidence: openAIResult.confidence,
        reason: 'OpenAI estimation (USDA unavailable)',
        limitation: 'Estimated values - may not be exact',
        components: openAIResult.components || [],
        isComplex: openAIResult.isComplex || false,
        cacheKey,
      };

      nutritionCache.set(cacheKey, result);
      return result;

    } catch (error) {
      // Enhanced error handling for JSON validation failures
      if (error instanceof JSONParseError) {
        console.error(`[SmartResolver] ❌ JSON parsing failed for "${foodQuery}":`, error.message);
        console.error(`[SmartResolver] Raw response (first 200 chars):`, error.rawResponse?.substring(0, 200));
      } else if (error instanceof OpenAIValidationError) {
        console.error(`[SmartResolver] ❌ OpenAI validation failed for "${foodQuery}":`, error.message);
        console.error(`[SmartResolver] Details:`, JSON.stringify(error.details, null, 2));
      } else {
        console.error(`[SmartResolver] ❌ Failed to resolve nutrition for "${foodQuery}":`, error.message);
      }

      // CRITICAL: Never cache failed responses - throw immediately
      throw error;
    }
  }

  /**
   * Check if food query contains specific ingredients that should be preserved
   * (e.g., "spinach curry" should stay spinach, not become "beef curry")
   * @private
   */
  _hasSpecificIngredient(foodQuery) {
    const query = foodQuery.toLowerCase();

    const specificIngredients = [
      // Proteins
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'salmon', 'tuna',
      'shrimp', 'crab', 'lobster', 'tofu', 'tempeh', 'seitan', 'eggs',

      // Vegetables (especially leafy greens that are often substituted)
      'spinach', 'kale', 'broccoli', 'cauliflower', 'cabbage', 'lettuce',
      'zucchini', 'eggplant', 'mushroom', 'pepper', 'tomato',

      // Grains/Starches
      'rice', 'quinoa', 'pasta', 'noodles', 'bread', 'potato', 'sweet potato',

      // Legumes
      'chickpea', 'lentil', 'beans', 'peas',
    ];

    return specificIngredients.some(ingredient => query.includes(ingredient));
  }

  /**
   * Resolve nutrition for multiple foods (batch)
   * More efficient for meal logging
   */
  async resolveFoodsBatch(foodItems) {
    // Filter out cached items - use deterministic cache keys
    const uncachedItems = foodItems.filter(item => {
      const cacheKey = getCacheKey('nutrition', item.name, item.portion || '1 serving');
      return !nutritionCache.has(cacheKey);
    });

    if (uncachedItems.length === 0) {
      console.log(`[SmartResolver] All ${foodItems.length} items from cache`);
      return foodItems.map(item => {
        const cacheKey = getCacheKey('nutrition', item.name, item.portion || '1 serving');
        return nutritionCache.get(cacheKey);
      });
    }

    console.log(`[SmartResolver] Batch resolving ${uncachedItems.length} items`);

    try {
      // Use OpenAI batch estimation (single API call for multiple foods)
      const prompt = buildBatchNutritionEstimationPrompt(uncachedItems);

      // Use safe wrapper - validates JSON BEFORE caching
      const estimates = await safeJSONCompletion(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { model: 'gpt-4o-mini', temperature: 0.0, maxRetries: 1 } // Zero temp for deterministic batch results
      );

      // Validate estimates is an array
      if (!Array.isArray(estimates)) {
        throw new OpenAIValidationError('Expected array of estimates', { type: typeof estimates });
      }

      // Cache results ONLY if validation passed
      const results = estimates.map((estimate, i) => {
        const item = uncachedItems[i];
        const cacheKey = getCacheKey('nutrition', item.name, item.portion || '1 serving');

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

    // Use safe wrapper - validates and sanitizes JSON BEFORE returning
    const estimation = await safeJSONCompletion(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.0, // Zero temperature for deterministic, precise nutrition facts
        maxTokens: 800,
        maxRetries: 1, // Retry once with repair prompt if JSON is malformed
      }
    );

    // Validate required fields exist
    const required = ['foodName', 'macros', 'confidence'];
    const missing = required.filter(field => !(field in estimation));

    if (missing.length > 0) {
      throw new OpenAIValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        { estimation, missing }
      );
    }

    // Return validated and structured response
    return {
      foodName: estimation.foodName,
      portionSize: estimation.portionSize || portion,
      servingGrams: estimation.servingGrams || 0,
      confidence: estimation.confidence,
      macros: estimation.macros,
      micros: estimation.micros || {},
      components: estimation.components || [], // Component breakdown for complex foods
      isComplex: estimation.isComplex || false, // Whether food has multiple components
      estimationMethod: estimation.estimationMethod || 'OpenAI estimation',
      needsVerification: estimation.needsVerification || false,
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
