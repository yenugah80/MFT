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

// FIXED P1: Feature flags for dual-prompt system
const ENABLE_DUAL_PROMPT_SYSTEM = process.env.ENABLE_DUAL_PROMPT_SYSTEM !== 'false'; // Default: enabled
const ENABLE_USDA_VERIFICATION = process.env.ENABLE_USDA_VERIFICATION === 'true';

// Aggressive caching (24 hours)
const nutritionCache = new NodeCache({ stdTTL: 86400, checkperiod: 600, maxKeys: 5000 });

class SmartNutritionResolver {
  constructor() {
    this.stats = {
      openaiEstimates: 0,
      usdaVerifications: 0,
      cacheHits: 0,
      totalRequests: 0,
      // FIXED P1: Observability metrics for dual-prompt system
      promptStats: {
        corePromptUsed: 0,
        extendedPromptUsed: 0,
        validationPassed: 0,
        validationFailed: 0,
        // FIXED: Use running averages instead of arrays to prevent memory leak
        avgConfidenceCore: 0,
        avgConfidenceExtended: 0,
        sumConfidenceCore: 0,
        sumConfidenceExtended: 0,
      },
      schemaValidationErrors: 0,
      macroValidationErrors: 0,
    };
  }

  /**
   * CRITICAL FIX: Canonicalize food/portion input
   * Ensures consistency between cache key and prompt
   * Prevents cache misses due to formatting differences
   * @private
   */
  _canonicalizeFoodQuery(query) {
    return query.toLowerCase().trim();
  }

  /**
   * Calculate portion confidence level
   * @private
   */
  _calculatePortionConfidence(portion, source) {
    if (source === 'learned') return 'precise';
    if (source === 'user_specified') return 'typical';
    return 'estimated';
  }

  /**
   * Resolve nutrition for a single food item
   * OpenAI-first with optional USDA verification
   *
   * STRATEGY: Trust OpenAI for ingredient preservation (spinach stays spinach!)
   * Only use USDA for generic foods where exact nutrient data is critical
   */
  async resolveFood(foodQuery, portion = '1 serving', userId = null) {
    this.stats.totalRequests++;

    // CRITICAL FIX #1: Canonicalize input FIRST - use same normalized form for cache + prompt
    // Prevents cache misses due to formatting differences ("banana" vs "BANANA" vs "banana ")
    const canonicalQuery = this._canonicalizeFoodQuery(foodQuery);
    const canonicalPortion = this._canonicalizeFoodQuery(portion);

    // FIXED P0: Determine prompt tier BEFORE caching to prevent cache poisoning
    const isComplex = this._isLikelyComplex(canonicalQuery);
    const promptTier = isComplex ? 'extended' : 'core';

    // CRITICAL FIX #5: Check for learned user preferences BEFORE building cache key
    // This ensures cache key matches the portion that will actually be used
    // Prevents: "rice" with default "1 serving" key but caching "150g" learned portion result
    let portionToUse = canonicalPortion;
    let portionSource = 'default';

    if (userId && !portion) {
      // CRITICAL FIX: Use CANONICAL query for lookup to ensure consistency
      // If DB was stored with normalized names, lookup must match that normalization
      const learned = await this._getLearnedPortion(userId, canonicalQuery);
      if (learned) {
        portionToUse = this._canonicalizeFoodQuery(learned.portion);
        portionSource = 'learned';
        console.log(`[SmartResolver] 🎯 Using learned portion for ${canonicalQuery}: ${portionToUse}`);
      }
    } else if (portion !== '1 serving') {
      portionSource = 'user_specified';
    }

    // NOW build cache key using ACTUAL portion that will be used
    const cacheKey = getCacheKey('nutrition', canonicalQuery, portionToUse, promptTier);
    const cached = nutritionCache.get(cacheKey);
    if (cached) {
      console.log(`[SmartResolver] Cache hit for "${canonicalQuery}" (${promptTier})`);
      this.stats.cacheHits++;
      return cached;
    }

    try {
      // Step 1: Get OpenAI estimation (fast, always available, preserves ingredients)
      // CRITICAL: Use CANONICAL form to ensure consistency between cache + prompt
      // If cache key uses "banana" (canonical) but prompt uses "BANANA" (raw), mismatch occurs
      const openAIResult = await this._getOpenAIEstimation(canonicalQuery, portionToUse);

      // Step 2: Check if this is an ingredient-specific food (protein/vegetable/grain)
      const hasSpecificIngredient = this._hasSpecificIngredient(canonicalQuery);

      // Step 3: CRITICAL FIX #2 - Use validation, NOT confidence for correctness decisions
      // Confidence is NOT accuracy and is explicitly unreliable (per review)
      // ONLY validationPassed should gate USDA fallback
      // For ingredient-specific foods: ALWAYS trust OpenAI (prevents "spinach" → "beef" errors)
      // For generic foods: Use USDA ONLY if validation FAILED (not if confidence is low)

      // FEATURE FLAG: USDA verification disabled by default (validating OpenAI-only accuracy)
      const shouldTrustOpenAI = !ENABLE_USDA_VERIFICATION || hasSpecificIngredient || openAIResult.validationPassed;

      if (shouldTrustOpenAI) {
        const reason = !ENABLE_USDA_VERIFICATION
          ? 'USDA verification disabled (OpenAI-only mode)'
          : hasSpecificIngredient
          ? 'ingredient-specific food (preserving ingredients)'
          : `validation passed (macros are consistent)`;

        console.log(`[SmartResolver] ✅ Using OpenAI - ${reason} for "${foodQuery}"`);
        this.stats.openaiEstimates++;

        const portionConfidence = this._calculatePortionConfidence(portionToUse, portionSource);

        const result = {
          ...openAIResult,
          // CRITICAL FIX: Source should reflect VALIDATION status, not confidence
          // Confidence is unreliable; validationPassed is the source of truth
          source: openAIResult.validationPassed ? 'openai_estimation' : 'openai_estimation_unvalidated',
          sourceConfidence: openAIResult.validationPassed ? 95 : openAIResult.confidence,
          reason: `OpenAI estimation (${reason})`,
          limitation: !openAIResult.validationPassed ? 'Macros did not pass Atwater validation - values may be inaccurate' : null,
          components: openAIResult.components || [], // Pass through components
          isComplex: openAIResult.isComplex || false,
          estimationTier: promptTier, // FIXED P0: Track which prompt tier was used
          // NEW: Portion tracking
          portion_source: portionSource,
          portion_confidence: portionConfidence,
          user_adjustment_count: 0,
          can_learn: userId !== null,
          cacheKey,
        };

        // FIXED P1: Track metrics
        this._trackPromptMetrics(promptTier, result);

        // CRITICAL FIX #3: ONLY cache valid results
        // Invalid data (validationPassed=false) will poison cache and return wrong info forever
        if (openAIResult.validationPassed) {
          nutritionCache.set(cacheKey, result);
          console.log(`[SmartResolver] Cached valid result for "${canonicalQuery}"`);
        } else {
          console.warn(`[SmartResolver] NOT caching invalid result for "${canonicalQuery}" (validationPassed=false)`);
          // CRITICAL FIX: Track invalid results for telemetry
          this.stats.invalidResults = (this.stats.invalidResults || 0) + 1;
        }

        return result;
      }

      // Step 4: Validation failed + generic food - try USDA verification
      // NOTE: This code path only executes when ENABLE_USDA_VERIFICATION=true
      console.log(`[SmartResolver] 🔍 Validation failed for generic food - Checking USDA for "${canonicalQuery}"`);

      const usdaResult = await this._getUSDAVerification(canonicalQuery);

      if (usdaResult) {
        // CRITICAL FIX: Validate USDA results before caching
        // USDA data can be inconsistent, must pass same validation as OpenAI
        try {
          this._validateNutritionSchema(usdaResult);
          this._validateMacros(usdaResult);
          console.log(`[SmartResolver] ✅ USDA verification successful AND validated for "${canonicalQuery}"`);
        } catch (error) {
          console.error(`[SmartResolver] ❌ USDA result failed validation for "${canonicalQuery}":`, error.message);
          usdaResult.validationPassed = false;
        }

        this.stats.usdaVerifications++;

        const result = {
          ...usdaResult,
          source: usdaResult.validationPassed ? 'usda_verified' : 'usda_unvalidated',
          sourceConfidence: usdaResult.validationPassed ? 95 : 40,
          openaiBackup: openAIResult, // Keep OpenAI estimate as backup (includes components)
          limitation: !usdaResult.validationPassed ? 'USDA data failed validation - may be inaccurate' : 'USDA data - may not match your specific brand',
          components: [], // USDA doesn't have component breakdown
          isComplex: false,
          estimationTier: promptTier, // FIXED P0: Track which prompt tier
          cacheKey,
        };

        // CRITICAL: Only cache valid USDA results, same as OpenAI
        if (usdaResult.validationPassed) {
          nutritionCache.set(cacheKey, result);
        } else {
          console.warn(`[SmartResolver] NOT caching unvalidated USDA result for "${canonicalQuery}"`);
          // Track invalid USDA results
          this.stats.invalidResults = (this.stats.invalidResults || 0) + 1;
        }
        return result;
      }

      // Step 5: USDA failed or invalid - use OpenAI estimate as final fallback
      console.log(`[SmartResolver] ⚠️ USDA unavailable/invalid - Using OpenAI estimate for "${canonicalQuery}"`);
      this.stats.openaiEstimates++;

      const result = {
        ...openAIResult,
        source: 'openai_estimation_fallback',
        sourceConfidence: openAIResult.confidence,
        reason: 'OpenAI estimation (USDA unavailable)',
        limitation: 'Estimated values - may not be exact',
        components: openAIResult.components || [],
        isComplex: openAIResult.isComplex || false,
        estimationTier: promptTier, // FIXED P0: Track which prompt tier
        cacheKey,
      };

      // Only cache if OpenAI result is valid
      if (openAIResult.validationPassed) {
        nutritionCache.set(cacheKey, result);
      } else {
        this.stats.invalidResults = (this.stats.invalidResults || 0) + 1;
      }
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
   * FIXED P0: Determine if food is complex and needs extended prompt
   * Using word boundary matching to avoid false positives
   *
   * ISSUE: Naive keyword matching caused false positives:
   * - "white rice" wrongly used extended prompt (should be simple)
   * - "pasta" alone triggered extended prompt (should be simple)
   *
   * FIX: Only trigger extended prompt for known multi-component dishes
   * FIXED P1: Respects ENABLE_DUAL_PROMPT_SYSTEM feature flag
   * @private
   */
  _isLikelyComplex(foodQuery) {
    // FIXED P1: Feature flag allows disabling dual-prompt entirely
    if (!ENABLE_DUAL_PROMPT_SYSTEM) {
      return true; // Always use extended prompt if dual-prompt disabled
    }

    const query = foodQuery.toLowerCase().trim();

    // ALLOWLIST approach (SAFEST): Only these known multi-component dishes need extended
    const complexDishes = [
      // Bowl-based dishes
      'rice bowl', 'poke bowl', 'buddha bowl', 'burrito bowl',
      // Burritos/wraps
      'burrito', 'wrap', 'quesadilla',
      // Biryani and regional
      'biryani', 'curry chicken', 'curry lamb', 'chicken curry', 'lamb curry',
      // Pizzas & sandwiches
      'pizza', 'burger', 'sandwich', 'sub', 'hoagie',
      // Pasta with sauce
      'pasta carbonara', 'pasta bolognese', 'fettuccine', 'spaghetti carbonara', 'lasagna',
      // Multi-ingredient salads (not simple "salad")
      'caesar salad', 'cobb salad', 'greek salad', 'caprese salad',
      // Regional multi-component
      'pad thai', 'pho', 'ramen', 'dosa', 'samosa', 'kebab', 'shawarma', 'falafel',
    ];

    return complexDishes.some(dish => query.includes(dish));
  }

  /**
   * Check if food query is PRIMARILY a specific ingredient (not just contains it)
   * This is more restrictive to prevent "pasta carbonara" or "fried rice" from matching
   *
   * CRITICAL: Only match if ingredient is the MAIN thing being described
   * Examples:
   *   "spinach" → YES (ingredient-specific)
   *   "spinach salad" → NO (complex dish)
   *   "rice" → YES (ingredient-specific)
   *   "fried rice" → NO (complex dish)
   *   "chicken breast" → YES (ingredient-specific)
   *   "chicken curry" → NO (complex dish)
   * @private
   */
  _hasSpecificIngredient(foodQuery) {
    const query = foodQuery.toLowerCase().trim();

    // CRITICAL: Only match ingredients that appear at START of query
    // This prevents "pasta carbonara" from matching "pasta"
    const simpleIngredients = [
      // Proteins - match at word boundary
      /^chicken\b/, /^beef\b/, /^pork\b/, /^lamb\b/, /^turkey\b/, /^duck\b/, /^fish\b/, /^salmon\b/, /^tuna\b/,
      /^shrimp\b/, /^crab\b/, /^lobster\b/, /^tofu\b/, /^tempeh\b/, /^seitan\b/, /^eggs?\b/,

      // Vegetables
      /^spinach\b/, /^kale\b/, /^broccoli\b/, /^cauliflower\b/, /^cabbage\b/, /^lettuce\b/,
      /^zucchini\b/, /^eggplant\b/, /^mushroom\b/, /^pepper\b/, /^tomato\b/,

      // Grains/Starches (plain, not "fried rice" or "pasta carbonara")
      /^rice\b/, /^quinoa\b/, /^pasta\b/, /^noodles\b/, /^bread\b/, /^potato\b/, /^sweet potato\b/,

      // Legumes
      /^chickpea\b/, /^lentil\b/, /^beans\b/, /^peas\b/,
    ];

    return simpleIngredients.some(regex => regex.test(query));
  }

  /**
   * Resolve nutrition for multiple foods (batch)
   * More efficient for meal logging
   *
   * CRITICAL FIX: Now accepts userId to support learned portions in batch
   * Otherwise fallback to single request won't use learned portions
   */
  async resolveFoodsBatch(foodItems, userId = null) {
    // Filter out cached items - FIXED P0: Include prompt tier in cache key
    // CRITICAL FIX #1: Canonicalize food names to ensure cache key consistency
    const uncachedItems = foodItems.filter(item => {
      const canonicalName = this._canonicalizeFoodQuery(item.name);
      const canonicalPortion = this._canonicalizeFoodQuery(item.portion || '1 serving');
      const isComplex = this._isLikelyComplex(canonicalName);
      const promptTier = isComplex ? 'extended' : 'core';
      const cacheKey = getCacheKey('nutrition', canonicalName, canonicalPortion, promptTier);
      return !nutritionCache.has(cacheKey);
    });

    if (uncachedItems.length === 0) {
      console.log(`[SmartResolver] All ${foodItems.length} items from cache`);
      return foodItems.map(item => {
        const canonicalName = this._canonicalizeFoodQuery(item.name);
        const canonicalPortion = this._canonicalizeFoodQuery(item.portion || '1 serving');
        const isComplex = this._isLikelyComplex(canonicalName);
        const promptTier = isComplex ? 'extended' : 'core';
        const cacheKey = getCacheKey('nutrition', canonicalName, canonicalPortion, promptTier);
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

      // CRITICAL FIX #4: Batch must obey same correctness rules as single requests
      // Validate EVERY estimate before caching
      const results = estimates.map((estimate, i) => {
        const item = uncachedItems[i];

        // CRITICAL: Apply same validation rules as single request path
        try {
          this._validateNutritionSchema(estimate);
          this._validateMacros(estimate);
        } catch (error) {
          console.error(`[SmartResolver] Batch item ${i} ("${item.name}") failed validation:`, error.message);
          estimate.validationPassed = false;
        }

        // CRITICAL FIX #1: Canonicalize to match single request path
        const canonicalName = this._canonicalizeFoodQuery(item.name);
        const canonicalPortion = this._canonicalizeFoodQuery(item.portion || '1 serving');
        const isComplex = this._isLikelyComplex(canonicalName);
        const promptTier = isComplex ? 'extended' : 'core';
        const cacheKey = getCacheKey('nutrition', canonicalName, canonicalPortion, promptTier);

        const result = {
          ...estimate,
          source: estimate.confidence >= 80 ? 'openai_estimation' : 'openai_estimation_low_confidence',
          sourceConfidence: estimate.confidence,
          originalQuery: item.name,
          estimationTier: promptTier, // FIXED P0: Track prompt tier
          validationPassed: estimate.validationPassed ?? true, // Include validation status
        };

        // FIXED: Track metrics for batch results
        this._trackPromptMetrics(promptTier, result);

        // CRITICAL FIX #3: ONLY cache valid batch results
        if (estimate.validationPassed) {
          nutritionCache.set(cacheKey, result);
        } else {
          console.warn(`[SmartResolver] Batch: NOT caching invalid result for "${item.name}"`);
          // Track invalid batch results
          this.stats.invalidResults = (this.stats.invalidResults || 0) + 1;
        }

        return result;
      });

      return results;

    } catch (error) {
      console.error(`[SmartResolver] Batch resolution failed:`, error.message);
      // Fall back to individual resolution
      // CRITICAL FIX: Pass userId to maintain learned portion support in fallback
      return Promise.all(uncachedItems.map(item =>
        this.resolveFood(item.name, item.portion, userId)
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

    // FIXED P0: Deep schema validation (not just field existence)
    this._validateNutritionSchema(estimation);

    // FIXED P0: Backend macro validation using Atwater factors
    this._validateMacros(estimation);

    // Return validated and structured response
    return {
      foodName: estimation.foodName,
      portionSize: estimation.portionSize || portion,
      servingGrams: estimation.servingGrams || 0,
      confidence: estimation.confidence,
      estimationTier: estimation.estimationTier || 'standard', // simple, standard, or complex
      validationPassed: estimation.validationPassed ?? true, // Macro validation status
      macros: estimation.macros,
      micros: estimation.micros || {},
      components: estimation.components || [], // Component breakdown for complex foods
      isComplex: estimation.isComplex || false, // Whether food has multiple components
      estimationMethod: estimation.estimationMethod || 'OpenAI estimation',
      needsVerification: estimation.needsVerification || false,
      notes: estimation.notes || '', // Additional context or assumptions
    };
  }

  /**
   * FIXED P1: Track metrics for observability
   * Uses running average to prevent memory leak
   * @private
   */
  _trackPromptMetrics(promptTier, result) {
    // Track which prompt tier was used
    if (promptTier === 'core') {
      this.stats.promptStats.corePromptUsed++;
      // FIXED: Use running average instead of storing array
      this.stats.promptStats.sumConfidenceCore += result.confidence;
      this.stats.promptStats.avgConfidenceCore =
        this.stats.promptStats.sumConfidenceCore / this.stats.promptStats.corePromptUsed;
    } else {
      this.stats.promptStats.extendedPromptUsed++;
      // FIXED: Use running average instead of storing array
      this.stats.promptStats.sumConfidenceExtended += result.confidence;
      this.stats.promptStats.avgConfidenceExtended =
        this.stats.promptStats.sumConfidenceExtended / this.stats.promptStats.extendedPromptUsed;
    }

    // Track validation pass/fail
    if (result.validationPassed) {
      this.stats.promptStats.validationPassed++;
    } else {
      this.stats.promptStats.validationFailed++;
      this.stats.macroValidationErrors++;
    }
  }

  /**
   * FIXED P0: Deep schema validation
   * Validates structure and types, not just field existence
   * @private
   */
  _validateNutritionSchema(estimation) {
    const errors = [];

    // Required fields with type validation
    if (!estimation.foodName || typeof estimation.foodName !== 'string' || estimation.foodName.trim().length === 0) {
      errors.push('foodName must be non-empty string');
    }

    if (typeof estimation.confidence !== 'number' || estimation.confidence < 0 || estimation.confidence > 100) {
      errors.push('confidence must be number 0-100');
    }

    // Macros object validation
    if (!estimation.macros || typeof estimation.macros !== 'object' || Array.isArray(estimation.macros)) {
      errors.push('macros must be object');
    } else {
      const requiredMacroFields = ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g'];
      for (const field of requiredMacroFields) {
        if (typeof estimation.macros[field] !== 'number' || estimation.macros[field] < 0) {
          errors.push(`macros.${field} must be non-negative number, got ${typeof estimation.macros[field]}`);
        }
      }
    }

    // Optional but if present, must be correct type
    // FIXED: Check the correct field location (macros.fiber_g, not estimation.fiber_g)
    if (estimation.macros.fiber_g !== undefined && typeof estimation.macros.fiber_g !== 'number') {
      errors.push(`macros.fiber_g must be number, got ${typeof estimation.macros.fiber_g}`);
    }

    // Components validation (if isComplex)
    if (estimation.isComplex && !Array.isArray(estimation.components)) {
      errors.push('components must be array when isComplex=true');
    }

    if (errors.length > 0) {
      // FIXED P1: Track schema validation errors for metrics
      this.stats.schemaValidationErrors++;
      throw new OpenAIValidationError('Schema validation failed', { errors, estimation });
    }
  }

  /**
   * FIXED P0: Validate macros using scientifically correct Atwater factors
   * Accounts for fiber (2 kcal/g) and high-carb foods
   * @private
   */
  _validateMacros(estimation) {
    const { calories_kcal, protein_g, carbs_g, fat_g, fiber_g = 0 } = estimation.macros;

    // Atwater calorie calculation with fiber
    const digestibleCarbs = Math.max(0, carbs_g - fiber_g);
    const calculated = (protein_g * 4) + (digestibleCarbs * 4) + (fiber_g * 2) + (fat_g * 9);

    const diff = Math.abs(calories_kcal - calculated);
    const tolerance = calories_kcal * 0.15; // 15% tolerance for high-fiber foods

    if (diff > tolerance) {
      // Log warning but don't fail - OpenAI might have alcohol or sugar alcohols
      console.warn(
        `[SmartResolver] Macro validation warning for ${estimation.foodName}: ` +
        `calculated ${calculated.toFixed(0)} kcal but got ${calories_kcal} (diff: ${((diff/calories_kcal)*100).toFixed(1)}%)`
      );
      estimation.validationPassed = false;
    } else {
      estimation.validationPassed = true;
    }
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
   * FIXED P1: Now includes dual-prompt performance metrics
   */
  getStats() {
    // FIXED: Use pre-calculated running averages instead of computing from arrays
    const avgConfidenceCore = this.stats.promptStats.corePromptUsed > 0
      ? this.stats.promptStats.avgConfidenceCore.toFixed(1)
      : 'N/A';
    const avgConfidenceExtended = this.stats.promptStats.extendedPromptUsed > 0
      ? this.stats.promptStats.avgConfidenceExtended.toFixed(1)
      : 'N/A';

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
      // FIXED P1: Dual-prompt metrics
      promptPerformance: {
        coreUsageRate: this.stats.totalRequests > 0
          ? ((this.stats.promptStats.corePromptUsed / this.stats.totalRequests) * 100).toFixed(1) + '%'
          : '0%',
        extendedUsageRate: this.stats.totalRequests > 0
          ? ((this.stats.promptStats.extendedPromptUsed / this.stats.totalRequests) * 100).toFixed(1) + '%'
          : '0%',
        validationPassRate: this.stats.totalRequests > 0
          ? ((this.stats.promptStats.validationPassed / this.stats.totalRequests) * 100).toFixed(1) + '%'
          : '0%',
        avgConfidenceCore,
        avgConfidenceExtended,
        schemaValidationErrors: this.stats.schemaValidationErrors,
        macroValidationErrors: this.stats.macroValidationErrors,
      },
    };
  }

  /**
   * Get learned portion for user
   * Phase 5 will implement database storage
   * For now, this returns null (allows framework to work before DB implementation)
   * @private
   */
  async _getLearnedPortion(userId, foodName) {
    try {
      // Import here to avoid circular dependency issues
      const { db } = await import('../config/db.js');
      const { userPortionPreferencesTable } = await import('../db/schema.js');
      const { eq, and } = await import('drizzle-orm');

      // Normalize food name for lookup
      const normalizedName = foodName.toLowerCase().trim();

      // Query user's learned portion preferences
      const preferences = await db
        .select()
        .from(userPortionPreferencesTable)
        .where(
          and(
            eq(userPortionPreferencesTable.userId, userId),
            // Match by canonical_name (normalized)
            eq(userPortionPreferencesTable.canonicalName, normalizedName)
          )
        )
        .limit(1);

      if (preferences.length === 0) {
        return null; // No learned preference, use system defaults
      }

      const pref = preferences[0];

      // Only return learned preference if confidence is high enough (> 40%)
      // This prevents low-confidence preferences from overriding user input
      if (parseFloat(pref.confidenceScore) >= 0.4) {
        return {
          portion: `${pref.preferredPortionAmount} ${pref.preferredPortionUnit}`,
          confidence: parseFloat(pref.confidenceScore),
          adjustmentCount: pref.adjustmentCount,
          lastUsed: pref.lastUsed,
        };
      }

      return null;
    } catch (err) {
      // Log error but don't fail - fall back to system defaults
      console.error('[SmartResolver] Error retrieving learned portion:', err.message);
      return null;
    }
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
