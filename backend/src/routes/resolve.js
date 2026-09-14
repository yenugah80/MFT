/**
 * NUTRITION RESOLVER ENDPOINT
 * Unified pipeline for text/barcode/photo/voice → canonical meal draft
 *
 * Sources: OFF (barcode primary) → USDA (generic fallback) → OpenAI (completion)
 * Output: ResolvedMealDraft with provenance, confidence, and quality signals
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { FoodService } from "../services/foodService.js";
import { smartNutritionResolver } from "../services/smartNutritionResolver.js";
import { strategicFoodParser } from "../services/StrategicFoodParser.js";
import { premiumFeaturesService } from "../services/PremiumFeatures.js";
import { parseIngredientsText, shouldParseIngredients } from "../services/ingredientParser.js";
import { estimateMicronutrients } from "../services/micronutrientService.js";
import { v4 as uuidv4 } from "uuid";
import { buildUnifiedResponse } from "../utils/unifiedResponseBuilder.js";
import { getSpellingSuggestions, findSimilarFoods } from "../utils/fuzzyMatch.js";
import { buildDefaultPortion, getPortionAdjustmentOptions } from "../utils/portionDefaults.js";
import { getIngredientBreakdown, hasIngredientData } from "../services/ingredientEstimator.js";
import { ingredientBreakdownService } from "../services/ingredientBreakdownService.js";
import { attachOpenAIConsent } from '../middleware/requireOpenAIConsent.js';
import { aggregateCanonicalTotals, normalizeMicros, computeConfidenceTier } from "../utils/canonicalNutrition.js";
import { isNutrientsComplete, fillMissingNutrients, isMicrosComplete, mergeMissingMicros } from "../utils/nutrientCompleteness.js";
import { selectBestUSDAMatch } from "../utils/usdaMatching.js";

const router = express.Router();
router.use(requireAuth());
router.use(aiLimiter); // Strict rate limit for AI-powered endpoints

/**
 * POST /api/food/resolve
 * Resolve nutrition from any input modality
 *
 * Request:
 * {
 *   mode: "text" | "barcode" | "photo" | "voice",
 *   query?: string,
 *   barcode?: string,
 *   imageBase64?: string,
 *   mealType?: "breakfast" | "lunch" | "dinner" | "snack",
 *   userContext?: { goals?, dietaryPrefs? }
 * }
 *
 * Response: ResolvedMealDraft
 */
router.post("/", attachOpenAIConsent(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { mode, query, barcode, imageBase64, mealType, userContext } = req.body;

    // Validation
    if (!mode || !['text', 'barcode', 'photo', 'voice'].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode. Must be: text, barcode, photo, or voice" });
    }

    const draftId = uuidv4();
    let resolvedDraft;

    // Route to appropriate resolver
    switch (mode) {
      case 'barcode':
        if (!barcode) {
          return res.status(400).json({ error: "barcode required for barcode mode" });
        }
        resolvedDraft = await resolveBarcodeMode(barcode, draftId, mealType);
        break;

      case 'text':
      case 'voice': // Voice treated as text (after transcription)
        if (!query) {
          return res.status(400).json({ error: "query required for text/voice mode" });
        }
        // NEW: Pass userId to enable tier-based routing
        resolvedDraft = await resolveTextMode(query, draftId, mealType, userId);
        break;

      case 'photo':
        if (!imageBase64) {
          return res.status(400).json({ error: "imageBase64 required for photo mode" });
        }
        // Photo analysis is the one mode with no local alternative — there is no
        // offline image recogniser to fall back to — so it is the only mode that
        // must refuse rather than degrade. Barcode and text both have local
        // paths and keep working without consent.
        if (req.hasOpenAIConsent === false) {
          return res.status(403).json({
            success: false,
            code: 'openai_consent_required',
            error: 'Photo analysis needs AI. Enable it in Privacy settings, or log by text or barcode.',
            purpose: 'identify the foods in your meal photo',
            consentEndpoint: '/api/consent/give-openai-consent',
          });
        }
        resolvedDraft = await resolvePhotoMode(imageBase64, draftId, mealType);
        break;

      default:
        return res.status(400).json({ error: "Unsupported mode" });
    }

    // Apply user context hints (if available)
    if (userContext) {
      applyUserContext(resolvedDraft, userContext);
    }

    // Enrich items with micronutrients if missing (USDA FoodData Central + AI fallback)
    await enrichMissingMicronutrients(resolvedDraft);

    // Normalize every item's micros into canonical {value, unit} form here,
    // once, regardless of which resolver (text/photo/barcode) or enrichment
    // path produced them — bare AI numbers, OFF/USDA unit-suffixed strings,
    // and enrichment's bare numbers all land in different raw shapes (see
    // canonicalNutrition.js's header comment). Previously only the meal-level
    // totals.micros got this treatment; a single-item meal reads item.micros
    // directly and depended on MicrosGrid's own unit-guessing fallback on
    // mobile instead of a server-guaranteed unit.
    if (resolvedDraft?.items) {
      resolvedDraft.items = resolvedDraft.items.map((item) => ({
        ...item,
        micros: normalizeMicros(item.micros),
      }));
    }

    // Enrich with unified health metrics (healthScore, nutriScore, healthAnalysis)
    const enrichedDraft = enrichWithHealthMetrics(resolvedDraft);

    res.json(enrichedDraft);

  } catch (error) {
    console.error("[FoodResolve] Error:", error);
    res.status(500).json({
      error: "Resolution failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * BARCODE MODE RESOLVER
 * Pipeline: OFF primary → USDA fallback → OpenAI completion
 */
async function resolveBarcodeMode(barcode, draftId, mealType) {
  const sourceEvidence = [];

  // Step 1: OpenFoodFacts lookup (using transformed data)
  const offProduct = await FoodService.searchByBarcode(barcode);

  if (!offProduct) {
    return createErrorDraft(draftId, 'barcode', 'Product not found', mealType);
  }

  // P0 FIX: Validate offProduct structure to prevent crashes
  if (typeof offProduct !== 'object') {
    console.error(`[Resolve] Invalid OFF product structure for barcode ${barcode}:`, offProduct);
    return createErrorDraft(draftId, 'barcode', 'Invalid product data received', mealType);
  }

  // Validate required fields with safe defaults. calories/protein/carbs/fat/
  // fiber/sugar/sodium are left `null` (not 0) when OFF never reported them —
  // Math.max(0, null) would coerce to 0 and destroy that distinction, so
  // null is checked and passed through before the floor is applied.
  const safeNonNegative = (v) => (Number.isFinite(v) ? Math.max(0, v) : null);
  const servingGrams = offProduct.servingGrams;
  const scale = (v) => FoodService.scaleFromPer100g(safeNonNegative(v), servingGrams);
  const safeOffProduct = {
    title: typeof offProduct.title === 'string' ? offProduct.title : 'Unknown Product',
    servingSize: typeof offProduct.servingSize === 'string' ? offProduct.servingSize : '100g',
    servingGrams,
    calories: scale(offProduct.caloriesPer100g),
    protein: scale(offProduct.proteinPer100g),
    carbs: scale(offProduct.carbsPer100g),
    fat: scale(offProduct.fatPer100g),
    fiber: scale(offProduct.fiberPer100g),
    sugar: scale(offProduct.sugarPer100g),
    sodium: scale(offProduct.sodiumMgPer100g),
    micros: (offProduct.micros && typeof offProduct.micros === 'object') ? offProduct.micros : {},
    ingredients: Array.isArray(offProduct.ingredients) ? offProduct.ingredients : [],
    allergens: Array.isArray(offProduct.allergens) ? offProduct.allergens : [],
    nutriscore: (offProduct.nutriscore && typeof offProduct.nutriscore === 'string') ? offProduct.nutriscore : 'UNKNOWN',
    nutriscoreScore: Number.isFinite(offProduct.nutriscoreScore) ? offProduct.nutriscoreScore : null,
    ecoscore: (offProduct.ecoscore && typeof offProduct.ecoscore === 'string') ? offProduct.ecoscore : 'UNKNOWN',
    novaScore: Number.isFinite(offProduct.novaScore) ? offProduct.novaScore : null,
  };

  sourceEvidence.push({
    source: 'OFF',
    sourceId: barcode,
    url: `https://world.openfoodfacts.org/product/${barcode}`,
    fetchedAt: new Date().toISOString(),
    confidence: (safeOffProduct.calories > 0 && safeOffProduct.protein >= 0) ? 0.9 : 0.6,
    fieldsProvided: ['macros', 'micros', safeOffProduct.nutriscore !== 'UNKNOWN' ? 'nutriscore' : null].filter(Boolean)
  });

  // Build item from validated OFF data. gramsEquivalent matches whichever
  // basis the macros above were actually scaled to (real parsed serving
  // size, or 100g when unparseable) — previously pinned to 100 regardless,
  // while macros were the raw per-100g density, over/undercounting any
  // product whose real serving size wasn't ~100g.
  const item = {
    itemId: uuidv4(),
    name: safeOffProduct.title,
    portion: {
      amount: 1,
      unit: servingGrams ? 'serving' : '100g',
      gramsEquivalent: servingGrams || 100,
      servingText: safeOffProduct.servingSize,
      isEstimated: false
    },
    macros: {
      calories_kcal: safeOffProduct.calories,
      protein_g: safeOffProduct.protein,
      carbs_g: safeOffProduct.carbs,
      fat_g: safeOffProduct.fat,
      fiber_g: safeOffProduct.fiber,
      sugar_g: safeOffProduct.sugar,
      sodium_mg: safeOffProduct.sodium,
    },
    micros: safeOffProduct.micros,
    ingredients: safeOffProduct.ingredients.map(i => (typeof i === 'object' && i.name) ? i.name : String(i)).filter(Boolean),
    allergens: safeOffProduct.allergens.filter(a => typeof a === 'string'),
    scores: {
      nutriScore: safeOffProduct.nutriscore !== 'UNKNOWN' ? {
        grade: safeOffProduct.nutriscore,
        score: safeOffProduct.nutriscoreScore,
        isEstimated: false
      } : undefined,
      ecoScore: safeOffProduct.ecoscore !== 'UNKNOWN' ? {
        grade: safeOffProduct.ecoscore,
        isEstimated: false
      } : undefined,
      novaGroup: safeOffProduct.novaScore || undefined
    },
    sourceEvidence,
    flags: []
  };

  // Step 2: Parse raw ingredients text into structured components with nutrition
  const rawIngredientsText = offProduct.ingredients_text || offProduct.ingredientsText || '';
  if (shouldParseIngredients(rawIngredientsText)) {
    try {
      console.log(`[Resolve] Parsing barcode ingredients: ${rawIngredientsText.substring(0, 100)}...`);
      const parsedComponents = await parseIngredientsText(
        rawIngredientsText,
        {
          calories: safeOffProduct.calories,
          protein: safeOffProduct.protein,
          carbs: safeOffProduct.carbs,
          fat: safeOffProduct.fat,
        },
        { servingSize: safeOffProduct.servingSize }
      );

      if (parsedComponents && parsedComponents.length > 0) {
        item.components = parsedComponents;
        item.isComplex = parsedComponents.length > 1;
        item.ingredients = parsedComponents.map(c => ({
          name: c.name,
          portion: c.portion,
          calories: c.calories,
          protein: c.protein,
          carbs: c.carbs,
          fat: c.fat,
        }));
        console.log(`[Resolve] ✅ Parsed ${parsedComponents.length} ingredients from barcode label`);
      }
    } catch (err) {
      console.warn(`[Resolve] Failed to parse barcode ingredients:`, err.message);
      // Keep original ingredients array as fallback
    }
  }

  // Step 3: If nutrients incomplete, try USDA fallback
  if (!isNutrientsComplete(item.macros)) {
    // searchUSDAByName returns an ARRAY of candidate matches, not a single
    // result — passing it straight to fillMissingNutrients would read
    // `usdaData.macros` off an array (always undefined) and throw on the
    // first missing field. selectBestUSDAMatch (already used elsewhere in
    // this file for the same purpose) picks the best-scoring candidate.
    const usdaResults = await FoodService.searchUSDAByName(item.name);
    const usdaData = Array.isArray(usdaResults) && usdaResults.length > 0
      ? selectBestUSDAMatch(usdaResults, item.name)
      : (usdaResults && !Array.isArray(usdaResults) ? usdaResults : null);
    if (usdaData) {
      fillMissingNutrientsWithScaling(item, usdaData, item.portion?.gramsEquivalent);
      sourceEvidence.push({
        source: 'USDA',
        sourceId: usdaData.fdcId,
        confidence: 0.6,
        fetchedAt: new Date().toISOString(),
        fieldsProvided: ['macros_partial']
      });
      item.flags.push('incomplete_micros');
    }
  }

  // Step 4: Quality assessment
  const dataQuality = assessDataQuality([item]);

  return {
    draftId,
    mode: 'barcode',
    mealType,
    items: [item],
    totals: calculateTotals([item]),
    dataQuality,
    uiHints: generateUIHints([item], dataQuality)
  };
}

/**
 * TEXT MODE RESOLVER
 * NEW: Uses StrategicFoodParser with hybrid routing (rule-based vs AI)
 * Pipeline: StrategicFoodParser route → USDA search → OFF search → Best match selection
 */
/**
 * A near-zero calorie estimate from the AI-estimation path is not a
 * legitimately low-calorie food — at virtually any normal portion, a real,
 * recognized food has non-trivial calories. This is the signature of the
 * model not actually recognizing the name (a misspelling/garbled
 * transcription, in any language, for any food — not specific to any one
 * ingredient) and returning a placeholder/empty guess that still
 * "succeeds" (no exception thrown), which was previously only ever
 * soft-flagged as low-confidence and shown as a normal confirmed item.
 * Shared across every route that resolves an AI-estimated food (text via
 * resolveGenericFood below, voice via voiceLog.js) so the threshold and
 * the flag name can't drift between them.
 *
 * @returns {string|null} 'unrecognized_food_low_estimate' or null
 */
function flagUnrecognizedLowEstimate(source, calories) {
  // 'estimat' (not 'estimation') deliberately — text-mode's resolver uses
  // 'openai_estimation'/'openai_estimation_low_confidence'
  // (smartNutritionResolver.js), voice-mode's uses 'ai_estimate'
  // (OpenAIClient.js's estimateNutritionForText) — two different words for
  // the same "this came from an AI guess, not a real record lookup"
  // concept. Matching only 'estimation' silently never matched voice's
  // 'ai_estimate' at all, so this check never actually ran for voice input.
  if (!source || !source.includes('estimat')) return null;
  if (typeof calories === 'number' && calories < 5) {
    return 'unrecognized_food_low_estimate';
  }
  return null;
}

function spellingReviewFor(foodName) {
  if (!foodName || typeof foodName !== 'string') return null;
  const suggestion = getSpellingSuggestions(foodName);
  if (!suggestion.needsCorrection || !suggestion.didYouMean) return null;

  return {
    original: foodName,
    didYouMean: suggestion.didYouMean,
    confidence: Math.round(suggestion.confidence * 100),
    alternatives: suggestion.suggestions.slice(0, 3).map(candidate => candidate.name)
  };
}

function ingredientNames(food) {
  const values = [food?.name || food?.canonicalName];
  for (const ingredient of food?.ingredients || food?.components || []) {
    values.push(typeof ingredient === 'string'
      ? ingredient
      : ingredient?.name || ingredient?.foodName || ingredient?.canonicalName);
  }
  return values.filter(Boolean);
}

function attachSpellingReviews(parsedFood, resolvedItem, knownReviews) {
  // The resolver already ran this food through the AI parser and a real
  // record lookup (USDA/canonical dictionary/ingredient breakdown) before
  // this ever runs — confidenceTier reflects whether that already
  // succeeded. Re-validating an already-confidently-resolved name against
  // fuzzyMatch.js's fixed, necessarily-incomplete word list is how "parsley"
  // got flagged as a misspelling of "barley" (71% match) and "beet" of
  // "beef" (75%) — both real, common foods the resolver identified
  // correctly, just not everything the word list happens to contain. Only
  // fall through to the spelling check when the resolver's own confidence
  // is Low — i.e. it's already unsure, so a second opinion is worth having.
  // BUG FOUND 2026-09: computeConfidenceTier (canonicalNutrition.js) returns
  // the lowercase strings 'low' | 'medium' | 'high'. This guard compared
  // against 'Low' (capital L) — a value computeConfidenceTier never
  // produces — so `confidenceTier !== 'Low'` was true for every possible
  // tier, including a genuine 'low', and this function returned early on
  // every call. The spelling-suggestion system (fuzzyMatch.js's
  // findSimilarFoods, which correctly matches "moongsal" -> "moong dal" at
  // 78% and "Mondal" -> "moong dal" at 67%, confirmed directly) never
  // actually ran for ANY food through this path, for any user — not a
  // per-food gap, a total outage of the feature caused by one string
  // literal's casing.
  if (resolvedItem.confidenceTier && resolvedItem.confidenceTier !== 'low') {
    return;
  }

  const candidates = Array.from(new Set([
    ...ingredientNames(parsedFood),
    ...ingredientNames(resolvedItem),
  ]));
  const reviews = candidates
    .map(spellingReviewFor)
    .filter(Boolean);

  for (const review of reviews) {
    if (!knownReviews.some(existing => existing.original.toLowerCase() === review.original.toLowerCase())) {
      knownReviews.push(review);
    }
  }

  if (reviews.length === 0) return;
  resolvedItem.suggestions = reviews.map(review => ({
    original: review.original,
    canonical: review.didYouMean,
    confidence: review.confidence,
    alternatives: review.alternatives
  }));
  resolvedItem.requiresUserConfirmation = true;
  resolvedItem.flags = Array.from(new Set([
    ...(resolvedItem.flags || []),
    'spelling_confirmation_required'
  ]));
}

async function resolveTextMode(query, draftId, mealType, userId) {
  try {
    // Step 1: Parse text with StrategicFoodParser (handles hybrid routing based on user tier)
    const parseResult = await strategicFoodParser.parseFood(query, userId);

    if (!parseResult.success || !parseResult.items || parseResult.items.length === 0) {
      console.log(`[Resolve] Strategic parser returned: success=${parseResult.success}, items=${parseResult.items?.length || 0}`);
      return createErrorDraft(draftId, 'text', parseResult.message || 'Could not parse food from text', mealType);
    }

    console.log(`[Resolve] ✅ Parsed with ${parseResult.engine} engine: ${parseResult.items.length} items, confidence=${parseResult.confidence.toFixed(2)}`);

    // Step 2: Check for spelling suggestions for each parsed food
    const spellingSuggestions = [];
    for (const parsedFood of parseResult.items) {
      const foodName = parsedFood.name || parsedFood.canonicalName || '';
      if (foodName) {
        const review = spellingReviewFor(foodName);
        if (review) {
          spellingSuggestions.push(review);
          console.log(`[Resolve] 🔍 Spelling suggestion for "${foodName}": Did you mean "${review.didYouMean}"? (${review.confidence}% match)`);
        }
      }
    }

    // Step 3: Resolve each food
    const items = [];
    for (const parsedFood of parseResult.items) {
      const resolvedItem = await resolveGenericFood(parsedFood);
      attachSpellingReviews(parsedFood, resolvedItem, spellingSuggestions);
      items.push(resolvedItem);
    }

    const dataQuality = assessDataQuality(items);

    // Step 4: Build response with spelling suggestions
    const response = {
      draftId,
      mode: 'text',
      mealType,
      items,
      totals: calculateTotals(items),
      dataQuality,
      uiHints: generateUIHints(items, dataQuality),
      hasUnresolvedItems: items.some(item => item.requiresUserConfirmation),
      // Strategic parsing metadata
      strategicParsing: {
        engine: parseResult.engine,
        confidence: parseResult.confidence,
        cost: parseResult.cost,
        message: parseResult.message,
        userTier: parseResult.userTier
      }
    };

    // Add spelling suggestions if any food names might be misspelled
    if (spellingSuggestions.length > 0) {
      response.spellingSuggestions = spellingSuggestions;
      response.uiHints.gentleWarnings = response.uiHints.gentleWarnings || [];
      response.uiHints.gentleWarnings.push({
        title: 'Did you mean?',
        message: `Some food names might be misspelled. Suggestions: ${spellingSuggestions.map(s => `"${s.original}" → "${s.didYouMean}"`).join(', ')}`,
        actionable: true,
        ctaText: 'Review suggestions',
        type: 'spelling_suggestion'
      });
    }

    return response;
  } catch (error) {
    console.error(`[Resolve] Strategic parser error: ${error.message}`);
    // Fallback to legacy parsing
    const parsedFoods = await FoodService.parseTextToFoods(query);

    if (!parsedFoods || parsedFoods.length === 0) {
      return createErrorDraft(draftId, 'text', 'Could not parse food from text (fallback)', mealType);
    }

    // Check for spelling suggestions in fallback path too
    const spellingSuggestions = [];
    for (const parsedFood of parsedFoods) {
      const foodName = parsedFood.name || parsedFood.canonicalName || '';
      if (foodName) {
        const review = spellingReviewFor(foodName);
        if (review) spellingSuggestions.push(review);
      }
    }

    const items = [];
    for (const parsedFood of parsedFoods) {
      const resolvedItem = await resolveGenericFood(parsedFood);
      attachSpellingReviews(parsedFood, resolvedItem, spellingSuggestions);
      items.push(resolvedItem);
    }

    const dataQuality = assessDataQuality(items);
    const uiHints = generateUIHints(items, dataQuality);

    // Add spelling suggestions if any
    if (spellingSuggestions.length > 0) {
      uiHints.gentleWarnings = uiHints.gentleWarnings || [];
      uiHints.gentleWarnings.push({
        title: 'Did you mean?',
        message: `Some food names might be misspelled. Suggestions: ${spellingSuggestions.map(s => `"${s.original}" → "${s.didYouMean}"`).join(', ')}`,
        actionable: true,
        ctaText: 'Review suggestions',
        type: 'spelling_suggestion'
      });
    }

    return {
      draftId,
      mode: 'text',
      mealType,
      items,
      totals: calculateTotals(items),
      dataQuality,
      uiHints,
      hasUnresolvedItems: items.some(item => item.requiresUserConfirmation),
      spellingSuggestions: spellingSuggestions.length > 0 ? spellingSuggestions : undefined,
      strategicParsing: {
        engine: 'fallback_legacy',
        confidence: 0.5,
        message: 'Used legacy parsing due to strategic parser error'
      }
    };
  }
}

/**
 * PHOTO MODE RESOLVER
 * Pipeline: OpenAI vision → Multi-item detection → Individual item nutrition
 *
 * NEW: analyzeImage now returns multi-item format:
 * { items: [...], totals: {...}, mealSummary: {...} }
 * Each item has complete nutrition including macros and micros
 */
async function resolvePhotoMode(imageBase64, draftId, mealType) {
  // Step 1: Vision analysis (now returns multi-item format)
  const visionResult = await FoodService.analyzeImage(imageBase64);

  // Handle null or failed analysis
  if (!visionResult) {
    console.error('[Resolve] Photo analysis returned null');
    return createErrorDraft(draftId, 'photo', 'Could not analyze image', mealType);
  }

  // NEW: Handle multi-item format from vision analysis
  let detectedItems = [];

  if (visionResult.items && Array.isArray(visionResult.items)) {
    // New multi-item format
    console.log(`[Resolve] Photo detected ${visionResult.items.length} items`);
    detectedItems = visionResult.items;
  } else if (visionResult.foodName) {
    // Legacy single-item format - convert to multi-item
    console.log(`[Resolve] Photo detected (legacy format): "${visionResult.foodName}"`);

    if (visionResult.foodName === 'Unknown Food' || !visionResult.foodName.trim()) {
      return createErrorDraft(draftId, 'photo', 'Could not identify food in image', mealType);
    }

    detectedItems = [{
      name: visionResult.foodName,
      description: visionResult.description,
      portion: { amount: 1, unit: 'serving', estimatedGrams: 100 },
      macros: {
        calories: visionResult.calories || 0,
        protein: visionResult.protein || 0,
        carbs: visionResult.carbs || 0,
        fat: visionResult.fats || visionResult.fat || 0,
        fiber: visionResult.fiber || 0,
        sugar: visionResult.sugar || 0,
        sodium: visionResult.sodium || 0
      },
      micros: visionResult.micros || {},
      confidence: visionResult.confidence || 0.7,
      ingredients: visionResult.ingredients || [],
      isComplex: visionResult.isComplex || false
    }];
  } else {
    console.error('[Resolve] Photo analysis returned unexpected structure:', Object.keys(visionResult));
    return createErrorDraft(draftId, 'photo', 'Could not detect food in image', mealType);
  }

  if (detectedItems.length === 0) {
    return createErrorDraft(draftId, 'photo', 'No food detected in image', mealType);
  }

  // Step 2: Convert each detected item to resolved format
  const items = detectedItems.map((item, idx) => {
    const macros = item.macros || {};

    return {
      itemId: uuidv4(),
      name: item.name || `Item ${idx + 1}`,
      description: item.description || '',
      portion: {
        amount: item.portion?.amount || 1,
        unit: item.portion?.unit || 'serving',
        gramsEquivalent: item.portion?.estimatedGrams || 100,
        servingText: `${item.portion?.amount || 1} ${item.portion?.unit || 'serving'}`,
        isEstimated: true
      },
      macros: {
        calories_kcal: macros.calories || 0,
        protein_g: macros.protein || 0,
        carbs_g: macros.carbs || 0,
        fat_g: macros.fat || 0,
        fiber_g: macros.fiber || 0,
        sugar_g: macros.sugar || 0,
        sodium_mg: macros.sodium || 0
      },
      micros: item.micros || {},
      ingredients: item.ingredients || [],
      allergens: item.potentialAllergens || item.allergens || [],
      isComplex: item.isComplex || (item.ingredients && item.ingredients.length > 1),
      scores: {},
      sourceEvidence: [{
        source: 'OpenAI_Vision_MultiItem',
        sourceId: 'gpt-4o-vision',
        confidence: item.confidence || 0.7,
        fetchedAt: new Date().toISOString(),
        fieldsProvided: ['macros', 'micros', 'ingredients']
      }],
      flags: item.confidence < 0.7 ? ['photo_analyzed', 'portion_estimated', 'low_confidence'] : ['photo_analyzed', 'portion_estimated']
    };
  });

  console.log(`[Resolve] ✅ Photo analysis complete: ${items.length} items, total ${visionResult.totals?.calories || 'N/A'} kcal`);

  const dataQuality = assessDataQuality(items);

  return {
    draftId,
    mode: 'photo',
    mealType,
    items,
    totals: calculateTotals(items),
    dataQuality,
    uiHints: generateUIHints(items, dataQuality),
    // Include meal summary from vision
    mealSummary: visionResult.mealSummary || {
      totalItems: items.length,
      totalCalories: Math.round(items.reduce((sum, i) => sum + (i.macros.calories_kcal || 0), 0))
    }
  };
}

/**
 * RESOLVE GENERIC FOOD (text/photo parsed item)
 * ENHANCED: Uses Smart Nutrition Resolver with disambiguation and modifier handling
 */
async function resolveGenericFood(parsedFood) {
  const sourceEvidence = [];
  const itemId = uuidv4();

  try {
    // 🆕 Smart portion defaulting - distinguishes unit-based foods (roti, egg) from serving-based (dal, rice)
    const portionResult = buildDefaultPortion(
      parsedFood.name,
      parsedFood.quantity,
      parsedFood.unit
    );
    const portionStr = portionResult.portionString;

    console.log(`[Resolve] 🎯 Smart portion for "${parsedFood.name}": "${portionStr}" (source: ${portionResult.portionSource}, isCountable: ${portionResult.isCountable})`);

    // Use Smart Nutrition Resolver (OpenAI first, USDA verification for low confidence)
    // Use canonicalName for nutrition lookup (simplified for API), display name is preserved in parsedFood.name
    const lookupName = parsedFood.canonicalName || parsedFood.name;

    // 🆕 Pass parsed modifiers to resolver for better estimation
    const resolverContext = {
      negations: parsedFood.removed || parsedFood.negations || [],
      additions: parsedFood.additions || [],
      cookingMethod: parsedFood.cookingMethod,
      preparationContext: parsedFood.preparationContext,
    };

    const nutrition = await smartNutritionResolver.resolveFood(lookupName, portionStr, null, resolverContext);

    // Build source evidence
    sourceEvidence.push({
      source: nutrition.source,
      sourceId: nutrition.fdcId || nutrition.estimationMethod || 'openai',
      confidence: nutrition.sourceConfidence / 100, // Convert to 0-1 scale
      fetchedAt: new Date().toISOString(),
      fieldsProvided: ['macros', 'micros'],
      method: nutrition.estimationMethod || nutrition.source
    });

    // Build flags based on source and confidence
    const flags = [];
    if (!parsedFood.quantity) flags.push('portion_estimated');
    if (nutrition.source.includes('estimation')) {
      const lowEstimateFlag = flagUnrecognizedLowEstimate(nutrition.source, nutrition.macros?.calories_kcal);
      if (lowEstimateFlag) {
        flags.push(lowEstimateFlag);
      } else if (nutrition.sourceConfidence < 80) {
        flags.push('estimated_nutrients_low_confidence');
      } else {
        flags.push('ai_estimated_nutrients');
      }
    }
    if (nutrition.warning) flags.push('needs_verification');
    // Absolute calorie-density plausibility (attached by smartNutritionResolver).
    // A severe miss means the estimate is likely wrong by ~2x+ — surface it so the
    // review UI can prompt a correction rather than logging a bad number silently.
    if (nutrition.nutritionPlausible === false) {
      flags.push(nutrition.plausibilityCheck?.severity === 'severe'
        ? 'implausible_nutrition_severe'
        : 'implausible_nutrition');
    }
    // Calories were auto-reconciled from macros (Atwater) because the model's stated
    // total didn't add up — surfaced so the UI/audit trail can show it was corrected.
    if (nutrition.macroReconciled) flags.push('macro_reconciled');

    // 🆕 CRITICAL FIX: Preserve ORIGINAL parsed food name!
    // The smartNutritionResolver may return a hallucinated foodName (e.g., "rice" → "Indian Chicken Curry")
    // We must use the original parsed name from strategicFoodParser, not the resolver's name
    // Priority: parsedFood.name > parsedFood.originalInput > parsedFood.canonicalName > NEVER use nutrition.foodName
    const originalName = parsedFood.name || parsedFood.originalInput || parsedFood.canonicalName;

    // SAFETY: If we have NO parsed name at all, something is very wrong - log error but don't crash
    if (!originalName) {
      console.error(`[Resolve] ❌ CRITICAL: No original food name found! parsedFood:`, JSON.stringify(parsedFood));
      console.error(`[Resolve] ❌ Using nutrition.foodName as LAST RESORT: "${nutrition.foodName}"`);
    }

    const finalName = originalName || nutrition.foodName || 'Unknown Food';
    console.log(`[Resolve] 🔍 Food name resolution: parsed="${parsedFood.name}" → resolver="${nutrition.foodName}" → using="${finalName}"`);

    // 🆕 Get portion adjustment options for UI (allows user to change quantity)
    const portionAdjustmentOptions = getPortionAdjustmentOptions(parsedFood.name, portionStr);

    // 🆕 Get ingredient breakdown if available (for foods like roti, idli, etc.)
    const quantity = parsedFood.quantity || portionResult.quantity || 1;
    const ingredientBreakdown = getIngredientBreakdown(parsedFood.name, quantity);

    // 🆕 PRODUCTION-GRADE: Get full editable ingredient breakdown from AI service
    // This enables users to add/remove/modify ingredients and recalculate nutrition.
    // Fetched BEFORE `ingredients` below (moved up from after) so it can serve as a
    // reliable third fallback tier — see comment there.
    let editableIngredientBreakdown = null;
    try {
      // Detect user region from headers or default to US
      const userRegion = resolverContext.region || 'US';

      // Call ingredient breakdown service for AI-powered breakdown
      editableIngredientBreakdown = await ingredientBreakdownService.getIngredientBreakdown(
        finalName,
        {
          brand: parsedFood.brand,
          region: userRegion,
          existingNutrition: {
            calories: nutrition.macros?.calories_kcal || 0,
            protein: nutrition.macros?.protein_g || 0,
            carbs: nutrition.macros?.carbs_g || 0,
            fat: nutrition.macros?.fat_g || 0,
          },
          userId: null, // Will be populated from request context
        }
      );

      console.log(`[Resolve] ✅ Got editable ingredient breakdown for "${finalName}": ${editableIngredientBreakdown?.ingredients?.length || 0} ingredients`);
    } catch (err) {
      console.warn(`[Resolve] Ingredient breakdown service unavailable for "${finalName}":`, err.message);
      // Continue without editable breakdown - not a critical failure
    }

    // Determine ingredients: curated breakdown -> AI's own components -> the
    // dedicated ingredient-breakdown service. The middle tier is unreliable:
    // confirmed live, two equally composite dishes analyzed in the same
    // request ("coconut pulao" and "chicken gravy curry") — one came back
    // with a real components array, the other with none, despite both
    // clearly being multi-ingredient dishes. Falling through to
    // editableIngredientBreakdown (already fetched above for every item,
    // previously computed and shipped but only used for the separate
    // edit-ingredients flow) means a complex item is no longer silently
    // ingredient-less just because the whole-dish call happened not to
    // self-report a breakdown this time.
    const ingredients = ingredientBreakdown
      ? ingredientBreakdown.ingredients
      : (nutrition.components?.length > 0
          ? nutrition.components
          : (editableIngredientBreakdown?.ingredients || []).map((ing) => ({
              name: ing.name,
              portion: ing.portion,
              calories: ing.nutrition?.calories ?? 0,
              protein: ing.nutrition?.protein ?? 0,
              carbs: ing.nutrition?.carbs ?? 0,
              fat: ing.nutrition?.fat ?? 0,
            })));

    return {
      itemId,
      name: finalName, // 🆕 Use ORIGINAL parsed name, not resolver's potentially hallucinated name
      portion: {
        amount: parsedFood.quantity || portionResult.quantity || 1,
        unit: parsedFood.unit || portionResult.countableConfig?.defaultUnit || 'serving',
        gramsEquivalent: portionResult.gramsEquivalent || nutrition.servingGrams || 100,
        servingText: nutrition.portionSize,
        isEstimated: !parsedFood.quantity,
        // 🆕 Smart portion metadata for UI
        portionSource: portionResult.portionSource,
        isCountable: portionResult.isCountable,
        expectedCalories: portionResult.expectedCalories,
        adjustmentOptions: portionAdjustmentOptions, // For UI quantity picker
      },
      macros: nutrition.macros,
      micros: nutrition.micros || {},

      // 🆕 ENHANCED: Confidence intervals for uncertainty visualization
      confidenceIntervals: nutrition.confidenceIntervals || null,

      ingredients, // Curated ingredient breakdown or AI components
      ingredientBreakdown, // Full ingredient data with add-ons and edit capability
      components: nutrition.components || [], // Component breakdown for complex foods

      // 🆕 PRODUCTION-GRADE: Editable ingredient breakdown for UI
      // This enables users to:
      // - See all ingredients with their individual nutrition
      // - Remove ingredients (e.g., "no pickles")
      // - Add ingredients (e.g., "extra cheese")
      // - Substitute ingredients (e.g., "turkey instead of beef")
      // - Recalculate total nutrition after modifications
      editableIngredients: editableIngredientBreakdown ? {
        sessionId: editableIngredientBreakdown.sessionId,
        foodName: editableIngredientBreakdown.foodName,
        foodType: editableIngredientBreakdown.foodType,
        isEditable: editableIngredientBreakdown.isEditable,
        region: editableIngredientBreakdown.region,
        ingredients: editableIngredientBreakdown.ingredients?.map(ing => ({
          id: ing.id,
          name: ing.name,
          category: ing.category,
          isRemovable: ing.isRemovable,
          isOptional: ing.isOptional,
          portion: ing.portion,
          nutrition: ing.nutrition,
          alternatives: ing.alternatives,
        })) || [],
        totalNutrition: editableIngredientBreakdown.totalNutrition,
        suggestedAddOns: editableIngredientBreakdown.suggestedAddOns?.slice(0, 5) || [],
        nutritionSource: editableIngredientBreakdown.nutritionSource,
        modificationEndpoints: {
          remove: '/api/ingredients/remove',
          add: '/api/ingredients/add',
          modify: '/api/ingredients/modify',
          customize: '/api/ingredients/customize',
        }
      } : null,
      allergens: nutrition.potentialAllergens || nutrition.allergens || [],
      isComplex: nutrition.isComplex || false,
      scores: {},
      sourceEvidence,
      flags,
      nutritionPlausible: nutrition.nutritionPlausible ?? true,
      plausibilityCheck: nutrition.plausibilityCheck || null,
      macroReconciled: nutrition.macroReconciled ?? false,
      // Stage 3: item-level confidence, derived from the resolver's own
      // candidate-selection signals (source, plausibility, whether the
      // portion was stated or defaulted) rather than trusting Atwater
      // validation alone.
      resolutionSource: nutrition.source || null,
      confidenceTier: computeConfidenceTier({
        source: nutrition.source,
        portionIsEstimated: !parsedFood.quantity,
        plausibilitySeverity: nutrition.plausibilityCheck?.severity || 'none',
        validated: nutrition.macroConsistent !== false,
      }),

      // 🆕 ENHANCED: Disambiguation support for UI
      disambiguationNeeded: nutrition.disambiguationNeeded || false,
      possibleInterpretations: nutrition.possibleInterpretations || [],

      // 🆕 ENHANCED: Applied modifiers tracking
      modifiersApplied: nutrition.modifiersApplied || {
        negations: parsedFood.removed || [],
        additions: (parsedFood.additions || []).map(a => a.item || a),
        preparationContext: nutrition.modifiersApplied?.preparationContext || 'unknown',
      },

      // 🆕 ENHANCED: Recognition status for uncertain foods
      recognitionStatus: nutrition.recognitionStatus || 'identified',

      // 🆕 ENHANCED: Warnings from estimation
      warnings: nutrition.warnings || [],

      // 🆕 ENHANCED: Assumptions made during estimation
      assumptions: nutrition.assumptions || [],

      _smartResolver: {
        confidence: nutrition.confidence,
        recognitionStatus: nutrition.recognitionStatus,
        source: nutrition.source,
        cached: !!nutrition.cacheKey,
        reason: nutrition.reason,
        limitation: nutrition.limitation,
        reasoning: nutrition.reasoning, // CoT reasoning for complex foods
        validationStatus: nutrition.validationStatus,
      }
    };

  } catch (error) {
    console.error(`[Resolve] Smart resolver failed for "${parsedFood.name}":`, error.message);

    // Fallback: Try old USDA method
    const usdaResults = await FoodService.searchUSDAByName(parsedFood.name);

    const bestMatch = (usdaResults && usdaResults.length > 0)
      ? selectBestUSDAMatch(usdaResults, parsedFood.name)
      : null;

    if (bestMatch) {
      sourceEvidence.push({
        source: 'USDA_FALLBACK',
        sourceId: bestMatch.fdcId,
        confidence: bestMatch.matchScore,
        fetchedAt: new Date().toISOString(),
        fieldsProvided: ['macros', 'micros']
      });

      // CRITICAL: Use original parsed name, not USDA description
      // USDA description might be very different from what user typed
      return {
        itemId,
        name: parsedFood.name || parsedFood.originalInput || bestMatch.description, // Prefer original
        portion: {
          amount: parsedFood.quantity || 1,
          unit: parsedFood.unit || 'serving',
          gramsEquivalent: bestMatch.gramsPerServing,
          servingText: bestMatch.servingText,
          isEstimated: !parsedFood.quantity
        },
        macros: bestMatch.macros,
        micros: bestMatch.micros || {},
        scores: {},
        sourceEvidence,
        flags: parsedFood.quantity ? ['fallback_method'] : ['portion_estimated', 'fallback_method'],
        _usdaMatch: bestMatch.description, // Store USDA match for debugging
      };
    }

    // Ultimate fallback: return empty with error flag
    return {
      itemId,
      name: parsedFood.name,
      portion: {
        amount: parsedFood.quantity || 1,
        unit: parsedFood.unit || 'serving',
        isEstimated: true
      },
      macros: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      micros: {},
      scores: {},
      sourceEvidence,
      flags: ['estimated_nutrients', 'portion_estimated', 'resolution_failed']
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Enrich food items with micronutrients if missing
 * Uses USDA FoodData Central as primary source, AI fallback
 */
async function enrichMissingMicronutrients(draft) {
  if (!draft?.items || draft.items.length === 0) return;

  const enrichmentPromises = draft.items.map(async (item) => {
    // Skip if micros are already complete
    if (isMicrosComplete(item.micros)) {
      return;
    }

    try {
      const portion = item.portion?.servingText ||
                      `${item.portion?.amount || 1} ${item.portion?.unit || 'serving'}`;
      const macros = {
        calories: item.macros?.calories_kcal || 0,
        protein: item.macros?.protein_g || 0,
        carbs: item.macros?.carbs_g || 0,
        fat: item.macros?.fat_g || 0
      };

      // Call micronutrientService to get USDA/AI-estimated micros
      const estimatedMicros = await estimateMicronutrients(item.name, portion, macros);

      if (estimatedMicros && Object.keys(estimatedMicros).length > 0) {
        // Merge estimated micros with existing — fill ONLY keys that are
        // genuinely absent. A present value, including a confirmed zero, is
        // a real reading from a source already trusted enough to have run
        // first; a lower-confidence enrichment estimate must not overwrite
        // it. The previous `!existingNumValue` check treated 0 the same as
        // missing, so a food legitimately measured at 0mg sodium (or any
        // other real zero) could get silently overwritten by an estimate.
        item.micros = mergeMissingMicros(item.micros, estimatedMicros);

        // Add flag to indicate micros were enriched
        if (!item.flags) item.flags = [];
        if (!item.flags.includes('micros_enriched')) {
          item.flags.push('micros_enriched');
        }

        console.log(`[Resolve] ✅ Enriched micros for "${item.name}": ${Object.keys(estimatedMicros).length} nutrients`);
      }
    } catch (error) {
      console.warn(`[Resolve] Failed to enrich micros for "${item.name}":`, error.message);
      // Don't fail the whole request, just skip enrichment
    }
  });

  await Promise.all(enrichmentPromises);

  // Recalculate totals after enrichment, through the same canonical
  // aggregator used everywhere else — previously reimplemented its own
  // flat-number micros summation here, which stomped the {value, unit}
  // shape every other consumer expects right after it was computed.
  if (draft.totals) {
    draft.totals = aggregateCanonicalTotals(draft.items);
  }
}

// isNutrientsComplete, fillMissingNutrients, isMicrosComplete, and
// getMissingMicroKeys now live in utils/nutrientCompleteness.js (imported
// above) so they're unit-testable independent of this route's module graph.
// See that file's header comment for the field-aware rationale.
function fillMissingNutrientsWithScaling(item, usdaData, itemServingGrams) {
  return fillMissingNutrients(item, usdaData, itemServingGrams, FoodService.scaleFromPer100g);
}

// Legacy function kept for compatibility (not used with new algorithm)
function calculateMatchScore(description, query) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const descWords = description.toLowerCase().split(/\s+/);
  const matches = queryWords.filter(word => descWords.includes(word)).length;
  return matches / queryWords.length;
}

// Thin wrapper kept for call-site compatibility: the real aggregation now
// lives in canonicalNutrition.js so resolve.js, food.js, and voiceLog.js all
// produce byte-identical totals shapes regardless of input mode (text,
// photo, barcode, voice). See that module's header comment for why.
function calculateTotals(items) {
  return aggregateCanonicalTotals(items);
}

function assessDataQuality(items) {
  const flags = items.flatMap(i => i.flags);
  const avgConfidence = items.reduce((sum, i) => {
    const itemConf = i.sourceEvidence.reduce((s, e) => s + e.confidence, 0) / (i.sourceEvidence.length || 1);
    return sum + itemConf;
  }, 0) / items.length;

  let status = 'good';
  if (flags.includes('estimated_nutrients') || avgConfidence < 0.5) {
    status = 'needs_review';
  } else if (flags.includes('portion_estimated') || avgConfidence < 0.7) {
    status = 'questionable';
  }

  return {
    status,
    confidence: avgConfidence,
    reasons: [...new Set(flags)]
  };
}

function generateUIHints(items, dataQuality) {
  const highlightChips = [];
  const gentleWarnings = [];

  // Calculate totals for chips
  const totalProtein = items.reduce((sum, i) => sum + (i.macros.protein_g || 0), 0);
  const totalCarbs = items.reduce((sum, i) => sum + (i.macros.carbs_g || 0), 0);
  const totalCals = items.reduce((sum, i) => sum + (i.macros.calories_kcal || 0), 0);

  if (totalProtein > 30) {
    highlightChips.push({ text: `High protein (${Math.round(totalProtein)}g)`, sentiment: 'positive' });
  }
  if (totalCarbs < 20) {
    highlightChips.push({ text: 'Low carb', sentiment: 'neutral' });
  }

  // 🆕 ENHANCED: Check for disambiguation needed
  const ambiguousItems = items.filter(i => i.disambiguationNeeded);
  if (ambiguousItems.length > 0) {
    for (const item of ambiguousItems) {
      const options = item.possibleInterpretations?.map(p => p.interpretation).join(', ') || 'multiple options';
      gentleWarnings.push({
        title: `Clarification needed: "${item.name}"`,
        message: `This could mean: ${options}. Tap to select the correct option.`,
        actionable: true,
        ctaText: 'Clarify',
        type: 'disambiguation',
        itemId: item.itemId,
        possibleInterpretations: item.possibleInterpretations
      });
    }
  }

  // 🆕 ENHANCED: Check for uncertain recognition
  const uncertainItems = items.filter(i => i.recognitionStatus === 'uncertain' || i.recognitionStatus === 'unknown');
  if (uncertainItems.length > 0) {
    for (const item of uncertainItems) {
      gentleWarnings.push({
        title: item.recognitionStatus === 'unknown' ? `Unknown food: "${item.name}"` : `Uncertain: "${item.name}"`,
        message: item.recognitionStatus === 'unknown'
          ? `We couldn't identify this food. The estimate may be inaccurate.`
          : `We're not 100% sure about this food. Please verify.`,
        actionable: true,
        ctaText: 'Edit',
        type: 'recognition_uncertain',
        itemId: item.itemId,
        confidence: item._smartResolver?.confidence
      });
    }
  }

  // 🆕 ENHANCED: Check for applied modifiers
  const modifiedItems = items.filter(i =>
    i.modifiersApplied?.negations?.length > 0 ||
    i.modifiersApplied?.additions?.length > 0
  );
  if (modifiedItems.length > 0) {
    highlightChips.push({ text: 'Modifiers applied', sentiment: 'neutral' });
  }

  // 🆕 ENHANCED: Check for restaurant/fast food context
  const restaurantItems = items.filter(i =>
    i.modifiersApplied?.preparationContext === 'restaurant' ||
    i.modifiersApplied?.preparationContext === 'fast_food'
  );
  if (restaurantItems.length > 0) {
    const context = restaurantItems[0].modifiersApplied.preparationContext;
    highlightChips.push({
      text: context === 'fast_food' ? 'Fast food' : 'Restaurant',
      sentiment: 'warning'
    });
    gentleWarnings.push({
      title: context === 'fast_food' ? 'Fast food adjustment' : 'Restaurant adjustment',
      message: 'Calories have been adjusted higher to account for typical restaurant cooking (more oil, butter, salt).',
      actionable: false,
      type: 'context_adjustment'
    });
  }

  // 🆕 ENHANCED: Show confidence intervals for low-confidence items
  const lowConfidenceItems = items.filter(i => (i._smartResolver?.confidence || 100) < 70);
  if (lowConfidenceItems.length > 0) {
    const item = lowConfidenceItems[0];
    if (item.confidenceIntervals?.calories) {
      gentleWarnings.push({
        title: 'Calorie estimate range',
        message: `Due to uncertainty, actual calories could be ${item.confidenceIntervals.calories.low}-${item.confidenceIntervals.calories.high} kcal.`,
        actionable: false,
        type: 'confidence_interval'
      });
    }
  }

  // 🆕 ENHANCED: Surface any warnings from estimation
  for (const item of items) {
    if (item.warnings && item.warnings.length > 0) {
      for (const warning of item.warnings) {
        if (!gentleWarnings.some(w => w.message === warning)) {
          gentleWarnings.push({
            title: 'Estimation note',
            message: warning,
            actionable: false,
            type: 'estimation_warning'
          });
        }
      }
    }
  }

  // Gentle warnings
  if (dataQuality.reasons.includes('portion_estimated')) {
    gentleWarnings.push({
      title: 'Portion estimate',
      message: 'We estimated the portion size. You can adjust it for accuracy.',
      actionable: true,
      ctaText: 'Adjust portions'
    });
  }

  const oneLineSummary = items.length === 1
    ? `${items[0].name}, ${Math.round(totalCals)} kcal`
    : `${items.length} items, ${Math.round(totalCals)} kcal`;

  // 🆕 ENHANCED: Add confidence interval to summary for uncertain items
  const avgConfidence = items.reduce((sum, i) => sum + (i._smartResolver?.confidence || 85), 0) / items.length;
  const summaryWithConfidence = avgConfidence < 70 && items[0]?.confidenceIntervals?.calories
    ? `${oneLineSummary} (${items[0].confidenceIntervals.calories.low}-${items[0].confidenceIntervals.calories.high})`
    : oneLineSummary;

  return {
    highlightChips,
    gentleWarnings,
    oneLineSummary: summaryWithConfidence
  };
}

function createErrorDraft(draftId, mode, errorMsg, mealType) {
  return {
    draftId,
    mode,
    mealType,
    items: [],
    totals: { macros: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, micros: {} },
    dataQuality: { status: 'needs_review', confidence: 0, reasons: [errorMsg] },
    uiHints: {
      highlightChips: [],
      gentleWarnings: [{
        title: 'Resolution failed',
        message: errorMsg,
        actionable: false
      }],
      oneLineSummary: 'No food detected'
    }
  };
}

function applyUserContext(draft, userContext) {
  // Future: Add personalized hints based on user goals/prefs
  // Example: "This meal fits your high-protein goal"
}

/**
 * Enrich resolve draft with unified health metrics
 * Adds healthScore, nutriScore, and healthAnalysis to the response
 */
function enrichWithHealthMetrics(draft) {
  if (!draft || !draft.items || draft.items.length === 0) {
    return {
      ...draft,
      healthScore: null,
      nutriScore: null,
      nutriScoreValue: null,
      healthAnalysis: null
    };
  }

  // Convert items to format expected by unified response builder
  const rawItems = draft.items.map(item => ({
    name: item.name,
    quantity: item.portion?.amount || 1,
    unit: item.portion?.unit || 'serving',
    // item.macros is already the resolved total for this item's described
    // portion (not a per-unit value) — without this, buildFoodItem
    // re-multiplies it by quantity, which only affects the healthScore/
    // nutriScore borrowed from `unified` below (draft.totals, what's
    // actually displayed, is untouched by this call).
    nutritionIsPerUnit: false,
    nutrition: {
      calories: item.macros?.calories_kcal || 0,
      protein: item.macros?.protein_g || 0,
      carbs: item.macros?.carbs_g || 0,
      fat: item.macros?.fat_g || 0,
      fiber: item.macros?.fiber_g || 0,
      sugar: item.macros?.sugar_g || 0,
      sodium: item.macros?.sodium_mg || 0
    },
    healthScore: item.scores?.healthScore,
    nutriScore: item.scores?.nutriScore?.grade,
    // Real AI-estimated meal weight, dropped here before this fix — without
    // it, unifiedResponseBuilder.js's calculateNutriScore() defaults to 100g
    // and scores a whole meal's absolute totals as if they were per-100g
    // density, producing a far harsher grade than reality.
    gramsEquivalent: item.portion?.gramsEquivalent || 100,
    cookingMethod: item.cookingMethod || null,
    confidence: item.sourceEvidence?.[0]?.confidence || 0.7,
    source: item.sourceEvidence?.[0]?.source || 'resolve'
  }));

  // Build unified response to get health metrics
  const unified = buildUnifiedResponse({
    inputText: draft.items[0]?.name || '',
    inputMode: draft.mode,
    mealType: draft.mealType,
    rawItems
  });

  // Merge health metrics into draft
  return {
    ...draft,
    healthScore: unified.healthScore,
    nutriScore: unified.nutriScore,
    nutriScoreValue: unified.nutriScoreValue,
    healthAnalysis: unified.healthAnalysis,
    suggestions: unified.suggestions,
    // Add health metrics to totals for consistency
    totals: {
      ...draft.totals,
      healthScore: unified.healthScore,
      nutriScore: unified.nutriScore,
      nutriScoreValue: unified.nutriScoreValue
    },
    // Update each item with its own health metrics
    items: draft.items.map((item, idx) => {
      const unifiedItem = unified.items[idx];
      return {
        ...item,
        healthScore: unifiedItem?.healthScore || null,
        nutriScore: unifiedItem?.nutriScore || null,
        nutriScoreValue: unifiedItem?.nutriScoreValue || null
      };
    })
  };
}

export default router;
export { attachSpellingReviews, flagUnrecognizedLowEstimate };
