/**
 * Smart Nutrition Resolver
 * Source-agnostic candidate scoring — no source is trusted by identity.
 *
 * Strategy:
 * 1. Gather every candidate available for the query: an OpenAI numeric
 *    estimate always, plus a USDA record (when ENABLE_USDA_VERIFICATION is
 *    set and a match clears the quality threshold in usdaMatching.js) and/
 *    or an ingredient-breakdown decomposition (for multi-ingredient dishes).
 * 2. Score every candidate the same way regardless of source
 *    (_scoreNutritionCandidate: completeness, micro coverage, provenance,
 *    match quality, minus a plausibility penalty) and pick the highest
 *    score. USDA is not preferred just for being USDA, and OpenAI is not
 *    preferred just for being fast — this replaced an earlier binary
 *    "OpenAI first, USDA only as a low-confidence fallback" gate that in
 *    practice almost never reached USDA at all (see the git history / this
 *    session's plan doc for the live-testing trace that found it).
 * 3. Cache results aggressively (24h TTL), keyed off the winning candidate.
 *
 * USDA verification itself is still gated by ENABLE_USDA_VERIFICATION
 * (disabled by default) — that flag controls whether a USDA candidate is
 * fetched at all, not whether USDA is "the" priority source once fetched.
 */

import { usdaClient } from './apiClients/USDAClient.js';
import {
  buildNutritionEstimationPrompt,
  buildBatchNutritionEstimationPrompt,
  detectBrandFood,
} from './apiClients/prompts/nutritionEstimation.js';
import { safeJSONCompletion, getCacheKey, JSONParseError, OpenAIValidationError } from './apiClients/SafeOpenAIWrapper.js';
import NodeCache from 'node-cache';
import { cache as redisCache, isRedisAvailable } from '../config/redis.js';
import { checkNutritionPlausibility, getExpectedDensityForFood, checkMacroConsistency } from './nutritionPlausibilityChecker.js';
import { selectBestUSDAMatch } from '../utils/usdaMatching.js';
import { ingredientBreakdownService } from './ingredientBreakdownService.js';
import { reconcileComponentTotals } from '../utils/reconcileComponents.js';

// FIXED P1: Feature flags for dual-prompt system
const ENABLE_DUAL_PROMPT_SYSTEM = process.env.ENABLE_DUAL_PROMPT_SYSTEM !== 'false'; // Default: enabled
const ENABLE_USDA_VERIFICATION = process.env.ENABLE_USDA_VERIFICATION === 'true';
// Self-correction: when an estimate is flagged implausible, re-query the model ONCE
// with the reference band injected as context (escalated to the stronger model). Only
// fires on the rare flagged item, so the common path keeps zero added latency.
const ENABLE_PLAUSIBILITY_CORRECTION = process.env.ENABLE_PLAUSIBILITY_CORRECTION !== 'false'; // Default: enabled
// Prompt-time calibration: inject the expected density for the dish INTO the estimation
// prompt so the model is anchored to a realistic value up front — for every recognized
// dish, at zero added latency (same call). This is the primary accuracy lever; the
// plausibility check + correction are the safety net for what slips through.
const ENABLE_DENSITY_CALIBRATION = process.env.ENABLE_DENSITY_CALIBRATION !== 'false'; // Default: enabled

// In-memory cache (fallback when Redis unavailable)
// Also serves as L1 cache for faster reads
const memoryCache = new NodeCache({ stdTTL: 3600, checkperiod: 600, maxKeys: 5000 }); // 1 hour L1 cache

// Redis cache TTL (48 hours - longer than memory since it's persistent)
const REDIS_CACHE_TTL = 48 * 60 * 60; // 48 hours in seconds

class SmartNutritionResolver {
  constructor() {
    this.stats = {
      openaiEstimates: 0,
      usdaVerifications: 0,
      cacheHits: 0,
      redisCacheHits: 0,
      memoryCacheHits: 0,
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
   * Get from two-level cache (memory L1 → Redis L2)
   * @private
   */
  async _cacheGet(key) {
    // L1: Check memory cache first (fastest)
    const memResult = memoryCache.get(key);
    if (memResult) {
      this.stats.memoryCacheHits++;
      return memResult;
    }

    // L2: Check Redis (persistent, shared across instances)
    if (isRedisAvailable()) {
      const redisResult = await redisCache.get(key);
      if (redisResult) {
        // Populate L1 cache for future requests
        memoryCache.set(key, redisResult);
        this.stats.redisCacheHits++;
        return redisResult;
      }
    }

    return null;
  }

  /**
   * Set in two-level cache (memory L1 + Redis L2)
   * @private
   */
  async _cacheSet(key, value) {
    // Always set in memory (L1)
    memoryCache.set(key, value);

    // Also set in Redis if available (L2 - persistent)
    if (isRedisAvailable()) {
      await redisCache.set(key, value, REDIS_CACHE_TTL);
    }
  }

  /**
   * Check if key exists in cache
   * @private
   */
  async _cacheHas(key) {
    // Check memory first
    if (memoryCache.has(key)) {
      return true;
    }

    // Check Redis
    if (isRedisAvailable()) {
      return await redisCache.exists(key);
    }

    return false;
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
   * Gathers every available candidate (OpenAI estimate, USDA record when
   * enabled and a match clears the quality threshold, ingredient-breakdown
   * decomposition for composite dishes) and picks the highest-scoring one —
   * see the file header for the full source-agnostic scoring strategy.
   *
   * @param {string} foodQuery - The food name/description
   * @param {string} portion - Portion size (default: '1 serving')
   * @param {string|null} userId - User ID for learned portions
   * @param {object} context - Additional context (modifiers, preparation, etc.)
   */
  async resolveFood(foodQuery, portion = '1 serving', userId = null, context = {}) {
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
    const cached = await this._cacheGet(cacheKey);
    if (cached) {
      const cacheSource = isRedisAvailable() ? 'Redis/Memory' : 'Memory';
      console.log(`[SmartResolver] Cache hit for "${canonicalQuery}" (${promptTier}) from ${cacheSource}`);
      this.stats.cacheHits++;
      return cached;
    }

    try {
      // Step 0: NEW - Check for known brand foods FIRST (skip AI for exact brand nutrition)
      const brandOverride = this._checkBrandFoodOverride(canonicalQuery);
      if (brandOverride.isBrandFood) {
        const result = {
          ...brandOverride.nutrition,
          estimationTier: 'brand_database',
          portion_source: portionSource,
          portion_confidence: 'precise',
          can_learn: userId !== null,
          cacheKey,
        };

        // Cache brand food results (they're highly accurate)
        await this._cacheSet(cacheKey, result);
        this.stats.openaiEstimates++; // Count as resolved
        return result;
      }

      // Step 1: Get OpenAI estimation (fast, always available, preserves ingredients)
      // CRITICAL: Use CANONICAL form to ensure consistency between cache + prompt
      // If cache key uses "banana" (canonical) but prompt uses "BANANA" (raw), mismatch occurs
      // ENHANCED: Pass context for modifier handling and preparation adjustments
      const openAIResult = await this._getOpenAIEstimation(canonicalQuery, portionToUse, context);
      const hasSpecificIngredient = this._hasSpecificIngredient(canonicalQuery);

      // Source-agnostic quality-based selection. Previously a binary gate
      // (shouldTrustOpenAI) let openAIResult.validationPassed alone decide
      // "trustworthy" — but that's only an Atwater sanity check (protein/
      // carbs/fat roughly agree with calories); it says nothing about
      // fiber/sugar/sodium/micros, which is exactly how "cooked pulao rice"
      // passed through with sugar_g:0, sodium_mg:0 unquestioned (confirmed
      // live). Now every candidate — OpenAI's own estimate, and exactly one
      // more source chosen by dish shape — is scored the same way by
      // _scoreNutritionCandidate, and the highest score wins. No source
      // wins just because of which source it is; USDA stays fully optional
      // (only consulted at all when ENABLE_USDA_VERIFICATION is set, and
      // never required — if it's unavailable or scores low, the resolver
      // continues normally on whatever else it has).
      // Checked per-candidate, before scoring — not just on the eventual
      // winner. Confirmed live this is necessary, not optional: "Banana
      // chips" (severe, 519 kcal/100g) and "Beans and white rice" both
      // out-scored the correct candidate on completeness/provenance alone;
      // checking plausibility only after picking a winner never catches a
      // wrong-food match that happens to look complete.
      const plausibilityFor = (macros, servingGrams, foodName) =>
        checkNutritionPlausibility({ foodName, macros, servingGrams }).severity;

      const candidates = [{
        source: 'openai_estimation',
        macros: openAIResult.macros,
        raw: openAIResult,
        quality: this._scoreNutritionCandidate(openAIResult.macros, {
          source: 'openai_estimation',
          hasMicros: !!(openAIResult.micros && Object.keys(openAIResult.micros).length > 0),
          plausibilitySeverity: plausibilityFor(openAIResult.macros, openAIResult.servingGrams, canonicalQuery),
        }),
      }];

      // Gather exactly one more candidate, chosen by dish shape — not every
      // source for every food, to avoid adding latency across the board.
      if (isComplex) {
        try {
          const breakdown = await ingredientBreakdownService.getIngredientBreakdown(canonicalQuery, { region: context.region });
          if (breakdown?.totalNutrition) {
            const t = breakdown.totalNutrition;
            // ingredientBreakdownService's schema never asks for sugar —
            // genuinely unknown for this candidate, not a confirmed 0.
            const macros = {
              calories_kcal: t.calories ?? null,
              protein_g: t.protein ?? null,
              carbs_g: t.carbs ?? null,
              fat_g: t.fat ?? null,
              fiber_g: t.fiber ?? null,
              sugar_g: null,
              sodium_mg: t.sodium ?? null,
            };
            candidates.push({
              source: 'ingredient_breakdown',
              macros,
              raw: breakdown,
              quality: this._scoreNutritionCandidate(macros, {
                source: 'ingredient_breakdown',
                ingredientCount: breakdown.ingredients?.length || 0,
                plausibilitySeverity: plausibilityFor(macros, undefined, canonicalQuery),
              }),
            });
          }
        } catch (err) {
          console.warn(`[SmartResolver] Ingredient breakdown unavailable for "${canonicalQuery}":`, err.message);
        }
      } else if (ENABLE_USDA_VERIFICATION) {
        const usdaResult = await this._getUSDAVerification(canonicalQuery);
        if (usdaResult) {
          try {
            this._validateNutritionSchema(usdaResult);
            this._validateMacros(usdaResult);
          } catch (error) {
            console.warn(`[SmartResolver] USDA result for "${canonicalQuery}" failed schema/macro validation (kept as a candidate, just scores lower):`, error.message);
          }
          candidates.push({
            source: 'usda_verified',
            macros: usdaResult.macros,
            raw: usdaResult,
            quality: this._scoreNutritionCandidate(usdaResult.macros, {
              source: 'usda_verified',
              hasMicros: !!(usdaResult.micros && Object.keys(usdaResult.micros).length > 0),
              matchQuality: usdaResult.matchScore,
              plausibilitySeverity: plausibilityFor(usdaResult.macros, usdaResult.servingGrams, canonicalQuery),
            }),
          });
        }
      }

      candidates.sort((a, b) => b.quality.score - a.quality.score);
      const winner = candidates[0];
      const runnerUp = candidates[1] || null;

      console.log(
        `[SmartResolver] Candidates for "${canonicalQuery}": ` +
        candidates.map(c => `${c.source}=${c.quality.score.toFixed(1)}`).join(', ') +
        ` → winner: ${winner.source}`
      );

      const portionConfidence = this._calculatePortionConfidence(portionToUse, portionSource);
      const macroConsistency = checkMacroConsistency({ foodName: canonicalQuery, macros: winner.macros });
      const winnerPlausibility = checkNutritionPlausibility({ foodName: canonicalQuery, macros: winner.macros, servingGrams: winner.raw.servingGrams });

      const result = {
        ...winner.raw,
        macros: winner.macros,
        source: winner.source,
        sourceConfidence: Math.round(winner.quality.score),
        qualityBreakdown: winner.quality.breakdown,
        runnerUpSource: runnerUp?.source || null,
        runnerUpScore: runnerUp ? Math.round(runnerUp.quality.score) : null,
        reason: `Highest-quality candidate (${winner.source}, score ${winner.quality.score.toFixed(1)}${runnerUp ? ` vs ${runnerUp.source} ${runnerUp.quality.score.toFixed(1)}` : ', no other candidate available'})`,
        // Atwater is a sanity flag on the result, never a trust gate.
        macroConsistent: macroConsistency.consistent,
        nutritionPlausible: winnerPlausibility.plausible,
        plausibilityCheck: winnerPlausibility,
        openaiBackup: winner.source === 'openai_estimation' ? null : openAIResult,
        components: winner.source === 'openai_estimation' ? (openAIResult.components || []) : [],
        isComplex: isComplex,
        estimationTier: promptTier,
        portion_source: portionSource,
        portion_confidence: portionConfidence,
        user_adjustment_count: 0,
        can_learn: userId !== null,
        cacheKey,
        hasSpecificIngredient,
      };

      this._trackPromptMetrics(promptTier, result);
      if (winner.source === 'usda_verified') this.stats.usdaVerifications++;
      else this.stats.openaiEstimates++;

      // Cache only when the winning candidate has real completeness signal
      // (>=4 of 7 macro fields present) — an empty/near-empty result would
      // poison the cache the same way an unvalidated one used to.
      if (winner.quality.breakdown.presentCount >= 4) {
        await this._cacheSet(cacheKey, result);
      } else {
        console.warn(`[SmartResolver] NOT caching low-completeness result for "${canonicalQuery}" (${winner.quality.breakdown.presentCount}/7 macro fields present)`);
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
      // South/Southeast Indian tempered/multi-ingredient dishes — previously missing,
      // which routed these to the minimal-token "simple" prompt tier and contributed
      // to implausible estimates (e.g. "Semiya upma" at ~half realistic calorie density)
      'upma', 'poha', 'khichdi', 'pongal', 'uttapam', 'idli sambar', 'vada', 'poriyal',
      'biryani rice', 'pulao', 'fried rice',
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

    // BUG (found live-testing "chicken curry" — it never reached USDA or
    // ingredient-breakdown because this returned true): the regexes below
    // are start-anchored word matches only ("/^chicken\b/"), which match
    // "chicken curry" and "fried rice" exactly as readily as "chicken
    // breast" and "rice" alone — despite this function's own docstring
    // explicitly listing "chicken curry → NO" and "fried rice → NO" as
    // required exclusions. Nothing ever implemented that exclusion. Reuse
    // the already-curated complex-dish list so a food never gets treated
    // as "just a specific ingredient" when it's also known to be complex.
    if (this._isLikelyComplex(query)) return false;

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
   * Source-agnostic quality score for a resolved nutrition candidate — no
   * source wins just because of WHICH source it came from. Every candidate
   * (OpenAI direct estimate, ingredient-breakdown totals, USDA record) is
   * scored the same way and the highest score wins.
   *
   * Deliberately does NOT use Atwater validationPassed as a component: that
   * check only proves protein/carbs/fat roughly agree with calories — it
   * says nothing about fiber/sugar/sodium/micros/food-identity/serving
   * size, so it must never by itself make a result "trustworthy" (the bug
   * that let "cooked pulao rice" pass through with sugar_g:0, sodium_mg:0
   * unquestioned). Completeness of the ACTUAL fields is what's scored here.
   *
   * @param {object|null} macros - canonical {calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg}
   * @param {object} context
   * @param {'openai_estimation'|'ingredient_breakdown'|'usda_verified'} context.source
   * @param {boolean} [context.hasMicros] - whether this candidate reports any micronutrients
   * @param {number|null} [context.matchQuality] - USDA's own 0-~180ish match score, when source is usda_verified
   * @param {number|null} [context.ingredientCount] - ingredient-breakdown's decomposition size, when source is ingredient_breakdown
   * @param {'none'|'moderate'|'severe'} [context.plausibilitySeverity] - calorie-density plausibility for THIS candidate specifically
   * @returns {{score: number, breakdown: object}}
   */
  _scoreNutritionCandidate(macros, { source, hasMicros = false, matchQuality = null, ingredientCount = null, plausibilitySeverity = 'none' } = {}) {
    if (!macros) return { score: 0, breakdown: { reason: 'no macros' } };

    // Nutrient completeness (up to 50): a field present and non-null counts,
    // REGARDLESS of whether its value is 0 — 0 can be a legitimate real
    // value (see requirement: don't require fiber/sugar/sodium to be
    // non-zero). Only null/undefined counts as missing.
    const macroFields = ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg'];
    const presentCount = macroFields.filter((f) => macros[f] !== null && macros[f] !== undefined).length;
    const completenessScore = (presentCount / macroFields.length) * 50;

    // Micronutrients (up to 15) — a real but secondary signal; a candidate
    // missing micros entirely isn't disqualified, just scores lower.
    const microScore = hasMicros ? 15 : 0;

    // Provenance (up to 20) — a bounded factor, not a gate. A record-based
    // or decomposed source starts with an edge over a single opaque AI
    // number, but a big completeness gap (the far larger 50-point factor
    // above) can still make a less-complete record lose to a more-complete
    // AI estimate, per "no source wins automatically."
    const provenanceScore = { usda_verified: 20, ingredient_breakdown: 15, openai_estimation: 10 }[source] ?? 5;

    // Match/representativeness quality (up to 15), source-specific signal
    // for how well THIS candidate actually fits the query.
    let matchScoreNormalized = 0;
    if (source === 'usda_verified' && typeof matchQuality === 'number') {
      matchScoreNormalized = Math.min(15, matchQuality / 10);
    } else if (source === 'ingredient_breakdown' && typeof ingredientCount === 'number') {
      matchScoreNormalized = Math.min(15, ingredientCount * 3);
    } else if (source === 'openai_estimation') {
      matchScoreNormalized = 10; // baseline — it always has some identification signal
    }

    // Plausibility penalty — the missing piece that let "Banana chips" win
    // for "banana" (519 kcal/100g, flagged severe), "Beans and white rice"
    // win for "white rice", and "POWERADE" win for "Coca-Cola": all three
    // were confirmed live to score HIGHER than the correct alternative on
    // completeness/provenance/match alone, because plausibility was only
    // checked on the already-chosen winner, after the fact. A wrong-food
    // match can still have complete-looking fields; this is what actually
    // catches it before it wins, not just flags it afterward. Sized larger
    // than any other single factor (up to 100) so a severe mismatch can't
    // be masked by otherwise-strong completeness/provenance scores.
    const plausibilityPenalty = plausibilitySeverity === 'severe' ? 100 : plausibilitySeverity === 'moderate' ? 40 : 0;

    const score = completenessScore + microScore + provenanceScore + matchScoreNormalized - plausibilityPenalty;
    return {
      score,
      breakdown: { completenessScore, microScore, provenanceScore, matchScoreNormalized, plausibilityPenalty, presentCount, totalFields: macroFields.length },
    };
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
    const uncachedItems = [];
    const cachedResults = [];

    for (const item of foodItems) {
      const canonicalName = this._canonicalizeFoodQuery(item.name);
      const canonicalPortion = this._canonicalizeFoodQuery(item.portion || '1 serving');
      const isComplex = this._isLikelyComplex(canonicalName);
      const promptTier = isComplex ? 'extended' : 'core';
      const cacheKey = getCacheKey('nutrition', canonicalName, canonicalPortion, promptTier);

      const cached = await this._cacheGet(cacheKey);
      if (cached) {
        cachedResults.push({ item, cached, cacheKey });
      } else {
        uncachedItems.push({ item, cacheKey, promptTier });
      }
    }

    if (uncachedItems.length === 0) {
      const cacheSource = isRedisAvailable() ? 'Redis/Memory' : 'Memory';
      console.log(`[SmartResolver] All ${foodItems.length} items from cache (${cacheSource})`);
      this.stats.cacheHits += cachedResults.length;
      return cachedResults.map(r => r.cached);
    }

    console.log(`[SmartResolver] Batch resolving ${uncachedItems.length} items`);

    try {
      // Extract original items for the prompt builder
      const itemsForPrompt = uncachedItems.map(u => u.item);

      // Use OpenAI batch estimation (single API call for multiple foods)
      const prompt = buildBatchNutritionEstimationPrompt(itemsForPrompt);

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
      const newResults = await Promise.all(estimates.map(async (estimate, i) => {
        const { item, cacheKey, promptTier } = uncachedItems[i];

        // CRITICAL: Apply same validation rules as single request path
        try {
          this._validateNutritionSchema(estimate);
          this._validateMacros(estimate);
        } catch (error) {
          console.error(`[SmartResolver] Batch item ${i} ("${item.name}") failed validation:`, error.message);
          estimate.validationPassed = false;
        }

        // Absolute plausibility check — catches internally-consistent-but-wrong-magnitude
        // estimates that _validateMacros can't (see nutritionPlausibilityChecker.js).
        const plausibilityCheck = checkNutritionPlausibility(estimate);

        const result = {
          ...estimate,
          source: estimate.confidence >= 80 ? 'openai_estimation' : 'openai_estimation_low_confidence',
          sourceConfidence: estimate.confidence,
          originalQuery: item.name,
          estimationTier: promptTier, // FIXED P0: Track prompt tier
          validationPassed: estimate.validationPassed ?? true, // Include validation status
          nutritionPlausible: plausibilityCheck.plausible,
          plausibilityCheck,
        };

        // FIXED: Track metrics for batch results
        this._trackPromptMetrics(promptTier, result);

        // CRITICAL FIX #3: ONLY cache valid batch results
        if (estimate.validationPassed) {
          await this._cacheSet(cacheKey, result);
        } else {
          console.warn(`[SmartResolver] Batch: NOT caching invalid result for "${item.name}"`);
          // Track invalid batch results
          this.stats.invalidResults = (this.stats.invalidResults || 0) + 1;
        }

        return result;
      }));

      // Merge cached results with new results in original order
      const allResults = [];
      let cachedIdx = 0;
      let newIdx = 0;

      for (const item of foodItems) {
        // Check if this item was cached
        if (cachedIdx < cachedResults.length && cachedResults[cachedIdx].item === item) {
          allResults.push(cachedResults[cachedIdx].cached);
          cachedIdx++;
        } else if (newIdx < newResults.length) {
          allResults.push(newResults[newIdx]);
          newIdx++;
        }
      }

      return allResults.length === foodItems.length ? allResults : newResults;

    } catch (error) {
      console.error(`[SmartResolver] Batch resolution failed:`, error.message);
      // Fall back to individual resolution
      // CRITICAL FIX: Pass userId to maintain learned portion support in fallback
      return Promise.all(uncachedItems.map(u =>
        this.resolveFood(u.item.name, u.item.portion, userId)
      ));
    }
  }

  /**
   * Get OpenAI nutrition estimation with enhanced preprocessing and post-processing
   * @private
   */
  async _getOpenAIEstimation(foodQuery, portion, context = {}) {
    // Build prompt with full preprocessing (abbreviations, homonyms, modifiers, context)
    const prompt = buildNutritionEstimationPrompt(foodQuery, portion, context);
    const { metadata } = prompt;

    // Log preprocessing results for debugging
    if (metadata.wasAbbreviationExpanded) {
      console.log(`[SmartResolver] 📝 Expanded abbreviation: "${metadata.abbreviation}" → "${metadata.expandedQuery}"`);
    }
    if (metadata.needsDisambiguation) {
      console.log(`[SmartResolver] ⚠️ Ambiguous food detected: "${metadata.homonym}" - possible: ${metadata.possibleMeanings.join(', ')}`);
    }
    if (metadata.negations.hasNegation) {
      console.log(`[SmartResolver] ➖ Negation modifiers: removed=[${metadata.negations.removedItems}], reduced=[${metadata.negations.reducedItems}]`);
    }
    if (metadata.additions.hasAdditions) {
      console.log(`[SmartResolver] ➕ Addition modifiers: ${metadata.additions.additions.map(a => `${a.item}×${a.multiplier}`).join(', ')}`);
    }

    // Prompt-time density calibration (accuracy lever, every dish, zero added latency):
    // anchor the model to a realistic per-100g density for THIS dish before it answers.
    // Additive context only — the model is told to override it if the described portion
    // or preparation clearly differs, so it never forces a wrong number onto a variant.
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
    if (ENABLE_DENSITY_CALIBRATION) {
      const expected = getExpectedDensityForFood(foodQuery);
      if (expected) {
        const anchor = expected.referenceKcalPer100g
          ? `about ${expected.referenceKcalPer100g} kcal per 100g (typical range ${expected.min}-${expected.max})`
          : `typically ${expected.min}-${expected.max} kcal per 100g`;
        messages.push({
          role: 'user',
          content:
            `CALIBRATION for "${foodQuery}": a standard preparation is ${anchor}. Use this as an ` +
            `anchor for calorie density unless the described portion or preparation clearly differs ` +
            `(e.g. extra oil/ghee, diet version, unusual portion). Keep macros internally consistent.`,
        });
      }
    }

    // Use safe wrapper - validates and sanitizes JSON BEFORE returning
    const estimation = await safeJSONCompletion(
      messages,
      {
        model: 'gpt-4o-mini',
        temperature: 0.0,
        maxTokens: 1200, // Increased for new schema with confidence intervals
        maxRetries: 1,
      }
    );

    // FIXED P0: Deep schema validation (not just field existence)
    this._validateNutritionSchema(estimation);

    // FIXED P0: Backend macro validation using Atwater factors
    this._validateMacros(estimation);

    // Post-processing: Apply preparation context adjustments if AI didn't already
    const adjustedMacros = this._applyContextAdjustments(
      estimation.macros,
      metadata.preparationContext,
      estimation.modifiersApplied
    );

    // Post-processing: Calculate confidence intervals if not provided
    let confidenceIntervals = estimation.confidenceIntervals ||
      this._calculateConfidenceIntervals(adjustedMacros, estimation.recognitionConfidence || estimation.confidence);

    // Absolute plausibility check on the final (context-adjusted) macros — catches
    // internally-consistent-but-wrong-magnitude estimates that _validateMacros can't
    // (see nutritionPlausibilityChecker.js for why "Semiya upma" at 87 kcal/100g slips
    // past the Atwater check but is still roughly half of a realistic value).
    let plausibilityCheck = checkNutritionPlausibility({
      foodName: estimation.foodName,
      macros: adjustedMacros,
      servingGrams: estimation.servingGrams,
    });

    // Self-correction loop: detection alone doesn't recover the real value. When the
    // estimate is flagged, re-query the model ONCE with the reference band as context.
    // Only runs on flagged items → the common (plausible) path adds zero latency.
    let correctedMacros = null;
    let correctionMeta = null;
    if (ENABLE_PLAUSIBILITY_CORRECTION && !plausibilityCheck.plausible) {
      const correction = await this._correctImplausibleEstimate(
        foodQuery, portion, context, estimation, adjustedMacros, plausibilityCheck
      );
      if (correction) {
        correctedMacros = correction.macros;
        correctionMeta = correction.meta;
        plausibilityCheck = correction.plausibilityCheck; // re-checked post-correction
        // Recompute uncertainty band from the corrected macros so it isn't stale.
        confidenceIntervals = this._calculateConfidenceIntervals(
          correctedMacros, estimation.recognitionConfidence || estimation.confidence
        );
      }
    }
    const finalMacros = correctedMacros || adjustedMacros;

    // Reconcile the ingredient/component breakdown against the FINAL total
    // (post context-adjustment, post plausibility-correction) so the item's
    // displayed total and its own ingredient list never silently disagree —
    // confirmed live: "chicken gravy curry" showed 165+60=225 across its two
    // components against a 180 total, a 25% gap _validateNutritionSchema
    // already detects (>15% tolerance) but previously only logged as a
    // warning nothing downstream ever reads (resolveGenericFood attaches it
    // to item.warnings, but no mobile screen renders that field).
    const finalComponents = estimation.isComplex
      ? reconcileComponentTotals(estimation.components, finalMacros?.calories_kcal)
      : (estimation.components || []);

    // Return validated and structured response with enhanced fields
    return {
      foodName: estimation.foodName,
      portionSize: estimation.portionSize || portion,
      servingGrams: estimation.servingGrams || 0,
      confidence: estimation.recognitionConfidence || estimation.confidence,
      recognitionStatus: estimation.recognitionStatus || 'identified',
      estimationTier: estimation.estimationTier || 'standard',
      validationPassed: estimation.validationPassed ?? true,
      nutritionPlausible: plausibilityCheck.plausible,
      plausibilityCheck,
      correctionApplied: !!correctedMacros,
      correctionMeta,
      macroReconciled: !!estimation.macroReconciled,
      originalCaloriesKcal: estimation.originalCaloriesKcal ?? null,

      // Macros with potential context adjustments (and correction, if it fired)
      macros: finalMacros,
      macrosOriginal: estimation.macros, // Keep original for comparison

      // Confidence intervals for uncertainty
      confidenceIntervals,

      // Micronutrients
      micros: estimation.micros || {},

      // Components for complex foods
      components: finalComponents,
      isComplex: estimation.isComplex || false,

      // Disambiguation info
      disambiguationNeeded: estimation.disambiguationNeeded || metadata.needsDisambiguation,
      possibleInterpretations: estimation.possibleInterpretations || (
        metadata.needsDisambiguation ? metadata.possibleMeanings.map((m, i) => ({
          interpretation: m,
          likelihood: i === 0 ? 0.6 : 0.4 / (metadata.possibleMeanings.length - 1)
        })) : []
      ),

      // Modifiers tracking
      modifiersApplied: {
        negations: metadata.negations.removedItems.concat(metadata.negations.reducedItems),
        additions: metadata.additions.additions.map(a => a.item),
        preparationContext: metadata.preparationContext.context,
        vagueQuantity: metadata.vagueQuantity.detected ? metadata.vagueQuantity.vagueWord : null,
        abbreviationExpanded: metadata.wasAbbreviationExpanded ? metadata.abbreviation : null,
      },

      // Validation and reasoning
      validationStatus: estimation.validationStatus || {
        atwaterValid: estimation.validationPassed ?? true,
        calculatedCalories: this._calculateAtwaterCalories(adjustedMacros),
        reportedCalories: adjustedMacros.calories_kcal,
        discrepancyPercent: 0,
      },
      reasoning: estimation.reasoning || null,

      // Metadata
      estimationMethod: estimation.estimationMethod || 'OpenAI estimation (enhanced)',
      assumptions: estimation.assumptions || [],
      warnings: estimation.warnings || [],
      potentialAllergens: estimation.potentialAllergens || [],
      needsVerification: estimation.needsVerification || false,

      // Preprocessing metadata for debugging
      _preprocessing: {
        originalQuery: metadata.originalQuery,
        expandedQuery: metadata.expandedQuery,
        wasExpanded: metadata.wasAbbreviationExpanded,
        contextApplied: metadata.preparationContext.context !== 'unknown',
        // NEW: Additional preprocessing flags
        isBrandFood: metadata.brandFood?.isBrandFood || false,
        brandName: metadata.brandFood?.brand || null,
        hasBone: metadata.boneIn?.hasBone || false,
        isLeftover: metadata.leftover?.isLeftover || false,
        hasSugarAlcohols: metadata.sugarAlcohols?.hasSugarAlcohols || false,
      },
    };
  }

  /**
   * Check if food is a known brand and return exact nutrition
   * This bypasses AI estimation for known fast food items
   * @private
   */
  _checkBrandFoodOverride(foodQuery) {
    const brandResult = detectBrandFood(foodQuery);

    if (brandResult.isBrandFood && brandResult.brandData) {
      const data = brandResult.brandData;
      console.log(`[SmartResolver] 🏷️ Brand food detected: "${brandResult.brandFood}" from ${data.brand}`);

      return {
        isBrandFood: true,
        nutrition: {
          foodName: brandResult.brandFood,
          portionSize: data.unit || '1 serving',
          servingGrams: 0, // Brand foods don't typically specify grams
          confidence: 98, // High confidence for brand data
          recognitionStatus: 'identified',
          macros: {
            calories_kcal: data.calories,
            protein_g: data.protein,
            carbs_g: data.carbs,
            fat_g: data.fat,
            fiber_g: data.fiber || 2, // Estimate fiber if not provided
            sugar_g: data.sugar || Math.round(data.carbs * 0.3), // Estimate sugar
            sodium_mg: data.sodium,
          },
          micros: {},
          components: [],
          isComplex: false,
          source: `brand_database_${data.brand.toLowerCase().replace(/[^a-z]/g, '_')}`,
          sourceConfidence: 98,
          validationPassed: true,
          assumptions: [`Using ${data.brand} official nutrition data`],
          warnings: [],
          potentialAllergens: [],
        },
      };
    }

    return { isBrandFood: false, nutrition: null };
  }

  /**
   * Apply preparation context adjustments to macros
   * @private
   */
  _applyContextAdjustments(macros, prepContext, alreadyApplied = {}) {
    // Skip if AI already applied modifiers
    if (alreadyApplied?.preparationContext && alreadyApplied.preparationContext !== 'unknown') {
      return macros;
    }

    const adjustments = prepContext?.adjustments;
    if (!adjustments) {
      return macros;
    }

    console.log(`[SmartResolver] 🍳 Applying ${prepContext.context} context adjustments`);

    return {
      ...macros,
      fat_g: Math.round(macros.fat_g * adjustments.fatMultiplier * 10) / 10,
      sodium_mg: Math.round(macros.sodium_mg * adjustments.sodiumMultiplier),
      // Recalculate calories based on adjusted fat
      calories_kcal: Math.round(
        (macros.protein_g * 4) +
        ((macros.carbs_g - (macros.fiber_g || 0)) * 4) +
        ((macros.fiber_g || 0) * 2) +
        (macros.fat_g * adjustments.fatMultiplier * 9)
      ),
    };
  }

  /**
   * Calculate confidence intervals based on recognition confidence
   * @private
   */
  _calculateConfidenceIntervals(macros, confidence) {
    // Determine interval width based on confidence
    let intervalPercent;
    if (confidence >= 90) {
      intervalPercent = 0.10; // ±10% for high confidence
    } else if (confidence >= 75) {
      intervalPercent = 0.20; // ±20% for medium confidence
    } else if (confidence >= 60) {
      intervalPercent = 0.30; // ±30% for low-medium confidence
    } else {
      intervalPercent = 0.40; // ±40% for low confidence
    }

    return {
      calories: {
        low: Math.round(macros.calories_kcal * (1 - intervalPercent)),
        high: Math.round(macros.calories_kcal * (1 + intervalPercent)),
      },
      protein: {
        low: Math.round(macros.protein_g * (1 - intervalPercent) * 10) / 10,
        high: Math.round(macros.protein_g * (1 + intervalPercent) * 10) / 10,
      },
      carbs: {
        low: Math.round(macros.carbs_g * (1 - intervalPercent) * 10) / 10,
        high: Math.round(macros.carbs_g * (1 + intervalPercent) * 10) / 10,
      },
      fat: {
        low: Math.round(macros.fat_g * (1 - intervalPercent) * 10) / 10,
        high: Math.round(macros.fat_g * (1 + intervalPercent) * 10) / 10,
      },
    };
  }

  /**
   * Calculate expected calories using Atwater factors
   * @private
   */
  _calculateAtwaterCalories(macros) {
    const digestibleCarbs = Math.max(0, (macros.carbs_g || 0) - (macros.fiber_g || 0));
    return Math.round(
      (macros.protein_g || 0) * 4 +
      digestibleCarbs * 4 +
      (macros.fiber_g || 0) * 2 +
      (macros.fat_g || 0) * 9
    );
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
   * ENHANCED: Validates new fields (confidenceIntervals, disambiguationNeeded, etc.)
   * @private
   */
  _validateNutritionSchema(estimation) {
    const errors = [];
    const warnings = [];

    // ═══════════════════════════════════════════════════════════════════
    // REQUIRED FIELDS
    // ═══════════════════════════════════════════════════════════════════

    // foodName - CRITICAL
    if (!estimation.foodName || typeof estimation.foodName !== 'string' || estimation.foodName.trim().length === 0) {
      errors.push('foodName must be non-empty string');
    }

    // confidence/recognitionConfidence - accept either
    const confidence = estimation.recognitionConfidence ?? estimation.confidence;
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      errors.push('confidence/recognitionConfidence must be number 0-100');
    }

    // ═══════════════════════════════════════════════════════════════════
    // MACROS VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    if (!estimation.macros || typeof estimation.macros !== 'object' || Array.isArray(estimation.macros)) {
      errors.push('macros must be object');
    } else {
      const requiredMacroFields = ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g'];
      for (const field of requiredMacroFields) {
        if (typeof estimation.macros[field] !== 'number' || estimation.macros[field] < 0) {
          errors.push(`macros.${field} must be non-negative number, got ${typeof estimation.macros[field]}`);
        }
      }

      // Optional macro fields - validate if present
      if (estimation.macros.fiber_g !== undefined && typeof estimation.macros.fiber_g !== 'number') {
        errors.push(`macros.fiber_g must be number, got ${typeof estimation.macros.fiber_g}`);
      }
      if (estimation.macros.sugar_g !== undefined && typeof estimation.macros.sugar_g !== 'number') {
        errors.push(`macros.sugar_g must be number, got ${typeof estimation.macros.sugar_g}`);
      }
      if (estimation.macros.sodium_mg !== undefined && typeof estimation.macros.sodium_mg !== 'number') {
        errors.push(`macros.sodium_mg must be number, got ${typeof estimation.macros.sodium_mg}`);
      }

      // ═══════════════════════════════════════════════════════════════════
      // MACRO CONSTRAINT VALIDATION
      // ═══════════════════════════════════════════════════════════════════

      // sugar_g <= carbs_g (sugar is subset of carbs)
      if (estimation.macros.sugar_g !== undefined && estimation.macros.carbs_g !== undefined) {
        if (estimation.macros.sugar_g > estimation.macros.carbs_g) {
          warnings.push(`sugar_g (${estimation.macros.sugar_g}) > carbs_g (${estimation.macros.carbs_g}) - constraint violation`);
          // Auto-fix: cap sugar at carbs
          estimation.macros.sugar_g = estimation.macros.carbs_g;
        }
      }

      // fiber_g <= carbs_g (fiber is subset of carbs)
      if (estimation.macros.fiber_g !== undefined && estimation.macros.carbs_g !== undefined) {
        if (estimation.macros.fiber_g > estimation.macros.carbs_g) {
          warnings.push(`fiber_g (${estimation.macros.fiber_g}) > carbs_g (${estimation.macros.carbs_g}) - constraint violation`);
          // Auto-fix: cap fiber at carbs
          estimation.macros.fiber_g = estimation.macros.carbs_g;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLEX FOOD VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    if (estimation.isComplex && !Array.isArray(estimation.components)) {
      errors.push('components must be array when isComplex=true');
    }

    // Validate component sum matches total (±15% tolerance). Rescaling
    // happens later, in the caller, once the FINAL macros (post context-
    // adjustment, post plausibility-correction) are known — rescaling here
    // against the pre-adjustment estimation.macros.calories_kcal would go
    // stale again if either of those later steps changes calories. Just
    // warn here; see the rescale block after `finalMacros` is computed.
    if (estimation.isComplex && Array.isArray(estimation.components) && estimation.components.length > 0) {
      const componentCalories = estimation.components.reduce((sum, c) => sum + (c.calories || 0), 0);
      const totalCalories = estimation.macros?.calories_kcal || 0;

      if (totalCalories > 0) {
        const discrepancy = Math.abs(componentCalories - totalCalories) / totalCalories;
        if (discrepancy > 0.15) { // 15% tolerance
          warnings.push(
            `Component calories (${componentCalories}) differ from total (${totalCalories}) by ${(discrepancy * 100).toFixed(1)}%`
          );
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // NEW FIELDS VALIDATION (enhanced schema)
    // ═══════════════════════════════════════════════════════════════════

    // recognitionStatus - optional but if present, must be valid
    if (estimation.recognitionStatus !== undefined) {
      const validStatuses = ['identified', 'uncertain', 'unknown'];
      if (!validStatuses.includes(estimation.recognitionStatus)) {
        warnings.push(`recognitionStatus "${estimation.recognitionStatus}" is not valid, expected: ${validStatuses.join('|')}`);
      }
    }

    // confidenceIntervals - optional but if present, validate structure
    if (estimation.confidenceIntervals) {
      const intervalFields = ['calories', 'protein', 'carbs', 'fat'];
      for (const field of intervalFields) {
        const interval = estimation.confidenceIntervals[field];
        if (interval) {
          if (typeof interval.low !== 'number' || typeof interval.high !== 'number') {
            warnings.push(`confidenceIntervals.${field} must have numeric low and high`);
          } else if (interval.low > interval.high) {
            warnings.push(`confidenceIntervals.${field}.low (${interval.low}) > high (${interval.high})`);
          }
        }
      }
    }

    // disambiguationNeeded + possibleInterpretations
    if (estimation.disambiguationNeeded === true) {
      if (!Array.isArray(estimation.possibleInterpretations) || estimation.possibleInterpretations.length < 2) {
        warnings.push('disambiguationNeeded=true but possibleInterpretations missing or has < 2 options');
      }
    }

    // assumptions - should be array
    if (estimation.assumptions !== undefined && !Array.isArray(estimation.assumptions)) {
      warnings.push('assumptions should be array');
    }

    // ═══════════════════════════════════════════════════════════════════
    // ERROR HANDLING
    // ═══════════════════════════════════════════════════════════════════

    // Log warnings but don't fail
    if (warnings.length > 0) {
      console.warn(`[SmartResolver] Schema warnings for "${estimation.foodName}":`, warnings);
      estimation._schemaWarnings = warnings;
    }

    // Fail on errors
    if (errors.length > 0) {
      this.stats.schemaValidationErrors++;
      throw new OpenAIValidationError('Schema validation failed', { errors, warnings, estimation });
    }
  }

  /**
   * Self-correction for a flagged-implausible estimate. Re-queries the model ONCE
   * with the reference density band injected as corrective context, escalated to the
   * stronger model (gpt-4o) since this only runs on rare outliers where accuracy
   * outweighs cost. Accepts the re-estimate ONLY if it is genuinely more plausible —
   * otherwise keeps the original and leaves the flag on for user review (never loops,
   * never silently downgrades). This is the "context matters" lever applied surgically.
   * @private
   */
  async _correctImplausibleEstimate(foodQuery, portion, context, originalEstimation, adjustedMacros, plausibilityCheck) {
    try {
      const currentDensity = plausibilityCheck.kcalPer100g;
      const { min, max } = plausibilityCheck.expectedRange;
      const direction = currentDensity < min ? 'too LOW' : 'too HIGH';
      const dish = originalEstimation.foodName;

      // Build the normal prompt, then append the correction as an extra user turn so
      // the hint reaches the model regardless of the prompt builder's internals.
      const basePrompt = buildNutritionEstimationPrompt(foodQuery, portion, context);
      const correctionHint =
        `IMPORTANT — RE-ESTIMATE: Your previous nutrition estimate for "${dish}" worked out to about ` +
        `${currentDensity} kcal per 100g, which is implausibly ${direction} for this dish. A typical ` +
        `"${dish}" is roughly ${min}-${max} kcal per 100g. Re-estimate carefully using a REALISTIC ` +
        `calorie density and portion weight for THIS specific dish, keeping macros internally consistent ` +
        `(protein×4 + carbs×4 + fat×9 ≈ calories). Return the same JSON schema.`;

      const reEstimate = await safeJSONCompletion(
        [
          { role: 'system', content: basePrompt.system },
          { role: 'user', content: basePrompt.user },
          { role: 'user', content: correctionHint },
        ],
        { model: 'gpt-4o', temperature: 0.0, maxTokens: 1200, maxRetries: 1 }
      );

      this._validateNutritionSchema(reEstimate);
      this._validateMacros(reEstimate);
      const reAdjusted = this._applyContextAdjustments(
        reEstimate.macros, context.preparationContext, reEstimate.modifiersApplied
      );
      const recheck = checkNutritionPlausibility({
        foodName: reEstimate.foodName || dish,
        macros: reAdjusted,
        servingGrams: reEstimate.servingGrams,
      });

      this.stats.plausibilityCorrections = (this.stats.plausibilityCorrections || 0) + 1;
      console.log(
        `[SmartResolver][correction] "${dish}": ${currentDensity} → ${recheck.kcalPer100g} kcal/100g ` +
        `(${recheck.plausible ? '✅ now plausible' : '⚠️ still implausible, keeping original + flag'})`
      );

      if (recheck.plausible) {
        return {
          macros: reAdjusted,
          plausibilityCheck: recheck,
          meta: {
            corrected: true,
            model: 'gpt-4o',
            reason: 'plausibility_correction',
            fromKcalPer100g: currentDensity,
            toKcalPer100g: recheck.kcalPer100g,
          },
        };
      }
      return null; // correction didn't help — keep original estimate and its flag
    } catch (err) {
      console.warn(`[SmartResolver][correction] Failed for "${originalEstimation.foodName}": ${err.message}`);
      return null;
    }
  }

  /**
   * FIXED P0: Validate macros using scientifically correct Atwater factors
   * Accounts for fiber (2 kcal/g) and high-carb foods
   *
   * Reconciliation: when stated calories don't reconcile with stated macros beyond
   * tolerance, AND there's no alcohol/sugar-alcohol explanation (ethanol and sugar
   * alcohols aren't tracked as their own macro field, so a mismatch there is expected),
   * trust the compositional macros and recompute calories from them via Atwater. Grams
   * reasoned from ingredients are less prone to error than a separately-stated total,
   * and this keeps calories_kcal — the value every downstream plausibility/calibration/
   * UI check anchors on — self-consistent. Deterministic, in-process, no network call.
   * @private
   */
  _validateMacros(estimation) {
    const { consistent, shouldReconcile, calculatedCalories, diffPercent } = checkMacroConsistency(estimation);

    if (consistent) {
      estimation.validationPassed = true;
      return;
    }

    const calories_kcal = estimation.macros.calories_kcal;

    if (!shouldReconcile) {
      // Expected mismatch (alcohol/sugar-alcohol) — don't reconcile, just flag as
      // unvalidated (existing behavior: lowers trust/confidence downstream, excluded
      // from cache).
      console.warn(
        `[SmartResolver] Macro validation warning for ${estimation.foodName}: ` +
        `calculated ${calculatedCalories} kcal but got ${calories_kcal} (diff: ${diffPercent.toFixed(1)}%) ` +
        `— not reconciling (alcohol/sugar-alcohol calories aren't in the macro fields)`
      );
      estimation.validationPassed = false;
      return;
    }

    // Genuine inconsistency, most likely an arithmetic slip on the model's stated total.
    // Reconcile deterministically instead of just flagging it.
    console.warn(
      `[SmartResolver] Macro/calorie mismatch for ${estimation.foodName}: ` +
      `stated ${calories_kcal} kcal vs ${calculatedCalories} kcal from macros ` +
      `(diff: ${diffPercent.toFixed(1)}%) — reconciling to macro-derived value`
    );
    estimation.macroReconciled = true;
    estimation.originalCaloriesKcal = calories_kcal;
    estimation.macros.calories_kcal = calculatedCalories;
    estimation.validationPassed = true;
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

      // Was: results[0] — the raw USDA API's own ranking, completely
      // unchecked against the actual query. selectBestUSDAMatch scores
      // every candidate (exact phrase, word order/coverage, ingredient-
      // conflict detection, cooking-method alignment) and returns null if
      // nothing clears a minimum quality bar, instead of confidently
      // attaching some other food's real nutrition data to this query.
      const bestMatch = selectBestUSDAMatch(results, foodQuery);
      if (!bestMatch) {
        console.warn(`[SmartResolver] No USDA match cleared the quality threshold for "${foodQuery}" — falling through.`);
        return null;
      }

      return {
        foodName: bestMatch.description,
        portionSize: bestMatch.servingText,
        servingGrams: bestMatch.gramsPerServing,
        confidence: 95, // USDA is authoritative
        macros: bestMatch.macros,
        micros: bestMatch.micros,
        fdcId: bestMatch.fdcId,
        dataType: bestMatch.dataType,
        matchScore: bestMatch.matchScore, // for quality-scoring by the caller
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
      memoryCacheSize: memoryCache.keys().length,
      redisAvailable: isRedisAvailable(),
      cacheHitRate: this.stats.totalRequests > 0
        ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      memoryCacheHitRate: this.stats.cacheHits > 0
        ? ((this.stats.memoryCacheHits / this.stats.cacheHits) * 100).toFixed(1) + '%'
        : '0%',
      redisCacheHitRate: this.stats.cacheHits > 0
        ? ((this.stats.redisCacheHits / this.stats.cacheHits) * 100).toFixed(1) + '%'
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
   * Clears both memory and Redis caches
   */
  async clearCache() {
    // Clear memory cache
    memoryCache.flushAll();

    // Clear Redis nutrition cache if available
    if (isRedisAvailable()) {
      await redisCache.delPattern('nutrition:*');
      console.log('[SmartResolver] Memory + Redis caches cleared');
    } else {
      console.log('[SmartResolver] Memory cache cleared (Redis not available)');
    }
  }
}

export const smartNutritionResolver = new SmartNutritionResolver();
export default smartNutritionResolver;
