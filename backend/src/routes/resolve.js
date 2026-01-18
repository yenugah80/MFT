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
import { v4 as uuidv4 } from "uuid";
import { buildUnifiedResponse } from "../utils/unifiedResponseBuilder.js";
import { getSpellingSuggestions, findSimilarFoods } from "../utils/fuzzyMatch.js";

const router = express.Router();
router.use(requireAuth);
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
router.post("/", async (req, res) => {
  try {
    const userId = req.auth.userId;
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
        resolvedDraft = await resolvePhotoMode(imageBase64, draftId, mealType);
        break;

      default:
        return res.status(400).json({ error: "Unsupported mode" });
    }

    // Apply user context hints (if available)
    if (userContext) {
      applyUserContext(resolvedDraft, userContext);
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

  // Validate required fields with safe defaults
  const safeOffProduct = {
    title: typeof offProduct.title === 'string' ? offProduct.title : 'Unknown Product',
    servingSize: typeof offProduct.servingSize === 'string' ? offProduct.servingSize : '100g',
    calories: Number.isFinite(offProduct.calories) ? Math.max(0, offProduct.calories) : 0,
    protein: Number.isFinite(offProduct.protein) ? Math.max(0, offProduct.protein) : 0,
    carbs: Number.isFinite(offProduct.carbs) ? Math.max(0, offProduct.carbs) : 0,
    fat: Number.isFinite(offProduct.fats || offProduct.fat) ? Math.max(0, offProduct.fats || offProduct.fat) : 0,
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

  // Build item from validated OFF data
  const item = {
    itemId: uuidv4(),
    name: safeOffProduct.title,
    portion: {
      amount: 1,
      unit: 'serving',
      gramsEquivalent: 100,
      servingText: safeOffProduct.servingSize,
      isEstimated: false
    },
    macros: {
      calories_kcal: safeOffProduct.calories,
      protein_g: safeOffProduct.protein,
      carbs_g: safeOffProduct.carbs,
      fat_g: safeOffProduct.fat,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0
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
    const usdaData = await FoodService.searchUSDAByName(item.name);
    if (usdaData) {
      fillMissingNutrients(item, usdaData);
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
        const suggestion = getSpellingSuggestions(foodName);
        if (suggestion.needsCorrection && suggestion.didYouMean) {
          spellingSuggestions.push({
            original: foodName,
            didYouMean: suggestion.didYouMean,
            confidence: Math.round(suggestion.confidence * 100),
            alternatives: suggestion.suggestions.slice(0, 3).map(s => s.name)
          });
          console.log(`[Resolve] 🔍 Spelling suggestion for "${foodName}": Did you mean "${suggestion.didYouMean}"? (${Math.round(suggestion.confidence * 100)}% match)`);
        }
      }
    }

    // Step 3: Resolve each food
    const items = [];
    for (const parsedFood of parseResult.items) {
      const resolvedItem = await resolveGenericFood(parsedFood);
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
        const suggestion = getSpellingSuggestions(foodName);
        if (suggestion.needsCorrection && suggestion.didYouMean) {
          spellingSuggestions.push({
            original: foodName,
            didYouMean: suggestion.didYouMean,
            confidence: Math.round(suggestion.confidence * 100),
            alternatives: suggestion.suggestions.slice(0, 3).map(s => s.name)
          });
        }
      }
    }

    const items = [];
    for (const parsedFood of parsedFoods) {
      const resolvedItem = await resolveGenericFood(parsedFood);
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
 * NEW: Uses Smart Nutrition Resolver (OpenAI-first with USDA verification)
 */
async function resolveGenericFood(parsedFood) {
  const sourceEvidence = [];
  const itemId = uuidv4();

  try {
    // Build portion string for Smart Resolver
    const portionStr = parsedFood.quantity && parsedFood.unit
      ? `${parsedFood.quantity} ${parsedFood.unit}`
      : '1 serving';

    // Use Smart Nutrition Resolver (OpenAI first, USDA verification for low confidence)
    // Use canonicalName for nutrition lookup (simplified for API), display name is preserved in parsedFood.name
    const lookupName = parsedFood.canonicalName || parsedFood.name;
    const nutrition = await smartNutritionResolver.resolveFood(lookupName, portionStr);

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
      if (nutrition.sourceConfidence < 80) {
        flags.push('estimated_nutrients_low_confidence');
      } else {
        flags.push('ai_estimated_nutrients');
      }
    }
    if (nutrition.warning) flags.push('needs_verification');

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

    return {
      itemId,
      name: finalName, // 🆕 Use ORIGINAL parsed name, not resolver's potentially hallucinated name
      portion: {
        amount: parsedFood.quantity || 1,
        unit: parsedFood.unit || 'serving',
        gramsEquivalent: nutrition.servingGrams || 100,
        servingText: nutrition.portionSize,
        isEstimated: !parsedFood.quantity
      },
      macros: nutrition.macros,
      micros: nutrition.micros || {},
      ingredients: nutrition.components || [], // 🆕 Map components to ingredients for frontend
      components: nutrition.components || [], // Component breakdown for complex foods
      allergens: nutrition.potentialAllergens || nutrition.allergens || [], // 🆕 Allergen info from AI
      isComplex: nutrition.isComplex || false, // Whether food has multiple ingredients
      scores: {},
      sourceEvidence,
      flags,
      _smartResolver: {
        confidence: nutrition.confidence,
        source: nutrition.source,
        cached: !!nutrition.cacheKey,
        reason: nutrition.reason,
        limitation: nutrition.limitation
      }
    };

  } catch (error) {
    console.error(`[Resolve] Smart resolver failed for "${parsedFood.name}":`, error.message);

    // Fallback: Try old USDA method
    const usdaResults = await FoodService.searchUSDAByName(parsedFood.name);

    if (usdaResults && usdaResults.length > 0) {
      const bestMatch = selectBestUSDAMatch(usdaResults, parsedFood.name);

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

function isNutrientsComplete(macros) {
  return macros.calories_kcal > 0 &&
         macros.protein_g >= 0 &&
         macros.carbs_g >= 0 &&
         macros.fat_g >= 0;
}

function fillMissingNutrients(item, usdaData) {
  // Only fill MISSING fields individually, don't overwrite existing values
  if (!isNutrientsComplete(item.macros)) {
    if (item.macros.calories_kcal === 0 && usdaData.macros.calories_kcal) {
      item.macros.calories_kcal = usdaData.macros.calories_kcal;
    }
    if (item.macros.protein_g === 0 && usdaData.macros.protein_g) {
      item.macros.protein_g = usdaData.macros.protein_g;
    }
    if (item.macros.carbs_g === 0 && usdaData.macros.carbs_g) {
      item.macros.carbs_g = usdaData.macros.carbs_g;
    }
    if (item.macros.fat_g === 0 && usdaData.macros.fat_g) {
      item.macros.fat_g = usdaData.macros.fat_g;
    }
    // Also fill optional macros if missing
    if (!item.macros.fiber_g && usdaData.macros.fiber_g) {
      item.macros.fiber_g = usdaData.macros.fiber_g;
    }
    if (!item.macros.sugar_g && usdaData.macros.sugar_g) {
      item.macros.sugar_g = usdaData.macros.sugar_g;
    }
    if (!item.macros.sodium_mg && usdaData.macros.sodium_mg) {
      item.macros.sodium_mg = usdaData.macros.sodium_mg;
    }
  }
}

function selectBestUSDAMatch(results, query) {
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2); // Remove stop words ("a", "an", "or")

  // ========== INGREDIENT CONFLICT DETECTION (CRITICAL!) ==========
  const mainIngredients = {
    proteins: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'tempeh', 'seitan'],
    vegetables: ['spinach', 'broccoli', 'kale', 'lettuce', 'cabbage', 'cauliflower', 'carrot', 'potato', 'tomato', 'onion', 'pepper', 'mushroom', 'eggplant'],
    grains: ['rice', 'wheat', 'quinoa', 'oats', 'barley', 'couscous']
  };

  // Find main ingredients in query
  const queryIngredients = [];
  for (const [category, ingredients] of Object.entries(mainIngredients)) {
    for (const ingredient of ingredients) {
      if (queryLower.includes(ingredient)) {
        queryIngredients.push({ ingredient, category });
      }
    }
  }

  const scored = results.map((result) => {
    const descLower = result.description.toLowerCase();
    const descWords = descLower.split(/\s+/);

    // ========== CRITICAL: Check for ingredient conflicts ==========
    let ingredientMismatch = false;
    for (const queryIng of queryIngredients) {
      // Check if description has a DIFFERENT ingredient from the same category
      const conflictingIngredients = mainIngredients[queryIng.category].filter(ing => ing !== queryIng.ingredient);
      for (const conflictIng of conflictingIngredients) {
        if (descLower.includes(conflictIng)) {
          console.log(`[Resolve] ❌ INGREDIENT MISMATCH: Query has "${queryIng.ingredient}" but result has "${conflictIng}" - "${result.description}"`);
          ingredientMismatch = true;
          break;
        }
      }
      if (ingredientMismatch) break;
    }

    // If there's an ingredient mismatch, return very low score
    if (ingredientMismatch) {
      return {
        ...result,
        matchScore: -1000,
        _debug: {
          ingredientMismatch: true,
          reason: 'Conflicting main ingredient (e.g., spinach vs beef)'
        }
      };
    }

    // ========== FACTOR 1: Exact Phrase Match (100 points) ==========
    // "chicken breast" in "Chicken, broilers, breast, meat only" gets full score
    const exactMatch = descLower.includes(queryLower) ? 100 : 0;

    // ========== FACTOR 2: Word Order Similarity (max 40 points) ==========
    // Prefer "chicken breast" over "breast of chicken"
    let orderScore = 0;
    for (let i = 0; i < queryWords.length - 1; i++) {
      const word1 = queryWords[i];
      const word2 = queryWords[i + 1];
      const word1Idx = descWords.indexOf(word1);
      const word2Idx = descWords.indexOf(word2);

      if (word1Idx >= 0 && word2Idx >= 0) {
        if (word2Idx === word1Idx + 1) {
          // Consecutive words in exact order
          orderScore += 20;
        } else if (word2Idx > word1Idx) {
          // Correct order but not consecutive
          orderScore += 10;
        }
      }
    }

    // ========== FACTOR 3: Word Coverage (max 50 points) ==========
    // How many query words appear in description?
    const matchedWords = queryWords.filter(word => descWords.includes(word)).length;
    const coverageScore = (matchedWords / queryWords.length) * 50;

    // ========== FACTOR 4: Simplicity Bonus (max 30 points) ==========
    // Prefer shorter, simpler descriptions
    // "Chicken, breast, raw" (4 words) better than "Chicken breast sandwich with lettuce and mayo" (8 words)
    const wordCount = descWords.length;
    const simplicityScore = Math.max(0, 30 - wordCount * 2); // Penalize 2 points per word

    // ========== FACTOR 5: Cooking Method Alignment (max 20 points or -10 penalty) ==========
    const cookingMethods = ['grilled', 'fried', 'baked', 'roasted', 'steamed', 'boiled', 'raw', 'cooked'];
    const cookingSynonyms = {
      'grilled': ['grilled', 'broiled', 'barbecued'],
      'baked': ['baked', 'roasted', 'oven'],
      'fried': ['fried', 'deep-fried', 'pan-fried'],
      'steamed': ['steamed'],
      'boiled': ['boiled', 'simmered'],
      'raw': ['raw', 'uncooked', 'fresh'],
      'cooked': ['cooked', 'prepared', 'dry heat', 'moist heat'],
    };

    let queryMethod = null;
    for (const method of cookingMethods) {
      if (queryLower.includes(method)) {
        queryMethod = method;
        break;
      }
    }

    let descMethod = null;
    for (const [method, synonyms] of Object.entries(cookingSynonyms)) {
      if (synonyms.some(syn => descLower.includes(syn))) {
        descMethod = method;
        break;
      }
    }

    let methodScore = 0;
    if (queryMethod && descMethod) {
      // Both have cooking method
      if (queryMethod === descMethod || cookingSynonyms[queryMethod]?.some(syn => descLower.includes(syn))) {
        methodScore = 20; // Perfect match or synonym
      } else {
        methodScore = -10; // Mismatched methods (grilled vs fried)
      }
    } else if (!queryMethod && !descMethod) {
      // Neither has method - prefer raw/generic foods
      methodScore = 15;
    } else if (!queryMethod && descMethod === 'raw') {
      // User didn't specify method, description is raw - good default
      methodScore = 10;
    } else if (!queryMethod && descMethod) {
      // User didn't specify method but desc has one (not raw)
      methodScore = -5; // Slight penalty (user might want raw)
    } else if (queryMethod && !descMethod) {
      // User specified method but desc doesn't have it
      methodScore = -10; // Penalty for missing method
    }

    // ========== FACTOR 6: Data Type Preference (max 10 points) ==========
    // Prefer SR Legacy (Standard Reference) over Branded for generic foods
    let dataTypeScore = 0;
    if (result.dataType === 'SR Legacy' || result.dataType === 'Foundation') {
      dataTypeScore = 10; // High-quality reference data
    } else if (result.dataType === 'Survey (FNDDS)') {
      dataTypeScore = 5; // Survey data
    } else {
      dataTypeScore = 0; // Branded or other
    }

    // ========== TOTAL SCORE ==========
    const totalScore = exactMatch + orderScore + coverageScore + simplicityScore + methodScore + dataTypeScore;

    return {
      ...result,
      matchScore: totalScore,
      _debug: {
        exactMatch,
        orderScore,
        coverageScore,
        simplicityScore,
        methodScore,
        dataTypeScore,
        total: totalScore
      }
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  const best = scored[0];

  console.log(
    `[Resolve] Best USDA match for "${query}": "${best.description}" ` +
    `(score: ${best.matchScore.toFixed(1)}, breakdown: exact=${best._debug.exactMatch}, ` +
    `order=${best._debug.orderScore}, coverage=${best._debug.coverageScore.toFixed(1)}, ` +
    `simplicity=${best._debug.simplicityScore}, method=${best._debug.methodScore}, ` +
    `dataType=${best._debug.dataTypeScore})`
  );

  // Log runner-ups for debugging
  if (scored.length > 1) {
    console.log(`[Resolve] Runner-up: "${scored[1].description}" (score: ${scored[1].matchScore.toFixed(1)})`);
  }

  return best;
}

// Legacy function kept for compatibility (not used with new algorithm)
function calculateMatchScore(description, query) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const descWords = description.toLowerCase().split(/\s+/);
  const matches = queryWords.filter(word => descWords.includes(word)).length;
  return matches / queryWords.length;
}

function calculateTotals(items) {
  const totals = {
    macros: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    micros: {}
  };

  items.forEach(item => {
    totals.macros.calories_kcal += item.macros.calories_kcal || 0;
    totals.macros.protein_g += item.macros.protein_g || 0;
    totals.macros.carbs_g += item.macros.carbs_g || 0;
    totals.macros.fat_g += item.macros.fat_g || 0;

    if (item.micros && typeof item.micros === 'object') {
      Object.entries(item.micros).forEach(([key, value]) => {
        let numValue;
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
        } else if (value && typeof value === 'object' && value.value !== undefined) {
          numValue = typeof value.value === 'number'
            ? value.value
            : parseFloat(String(value.value).replace(/[^0-9.]/g, ''));
        }

        if (!isNaN(numValue) && numValue > 0) {
          totals.micros[key] = (totals.micros[key] || 0) + numValue;
        }
      });
    }
  });

  return totals;
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

  return {
    highlightChips,
    gentleWarnings,
    oneLineSummary
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
