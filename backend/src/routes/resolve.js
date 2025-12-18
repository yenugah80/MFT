/**
 * NUTRITION RESOLVER ENDPOINT
 * Unified pipeline for text/barcode/photo/voice → canonical meal draft
 *
 * Sources: OFF (barcode primary) → USDA (generic fallback) → OpenAI (completion)
 * Output: ResolvedMealDraft with provenance, confidence, and quality signals
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { FoodService } from "../services/foodService.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
router.use(requireAuth);

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
        resolvedDraft = await resolveTextMode(query, draftId, mealType);
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

    res.json(resolvedDraft);

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

  sourceEvidence.push({
    source: 'OFF',
    sourceId: barcode,
    url: `https://world.openfoodfacts.org/product/${barcode}`,
    fetchedAt: new Date().toISOString(),
    confidence: (offProduct.calories !== null && offProduct.protein !== null) ? 0.9 : 0.6,
    fieldsProvided: ['macros', 'micros', offProduct.nutriscore !== 'UNKNOWN' ? 'nutriscore' : null].filter(Boolean)
  });

  // Build item from transformed OFF data
  const item = {
    itemId: uuidv4(),
    name: offProduct.title || 'Unknown Product',
    portion: {
      amount: 1,
      unit: 'serving',
      gramsEquivalent: 100,
      servingText: offProduct.servingSize || '100g',
      isEstimated: false
    },
    macros: {
      calories_kcal: offProduct.calories || 0,
      protein_g: offProduct.protein || 0,
      carbs_g: offProduct.carbs || 0,
      fat_g: offProduct.fat || 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0
    },
    micros: offProduct.micros || {},
    ingredients: offProduct.ingredients?.map(i => i.name) || [],
    allergens: offProduct.allergens || [],
    scores: {
      nutriScore: offProduct.nutriscore && offProduct.nutriscore !== 'UNKNOWN' ? {
        grade: offProduct.nutriscore,
        score: offProduct.nutriscoreScore || null,
        isEstimated: false
      } : undefined,
      ecoScore: offProduct.ecoscore && offProduct.ecoscore !== 'UNKNOWN' ? {
        grade: offProduct.ecoscore,
        isEstimated: false
      } : undefined,
      novaGroup: offProduct.novaScore || undefined
    },
    sourceEvidence,
    flags: []
  };

  // Step 2: If nutrients incomplete, try USDA fallback
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

  // Step 3: Quality assessment
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
 * Pipeline: OpenAI parse → USDA search → OFF search → Best match selection
 */
async function resolveTextMode(query, draftId, mealType) {
  // Step 1: Parse text with OpenAI
  const parsedFoods = await FoodService.parseTextToFoods(query);

  if (!parsedFoods || parsedFoods.length === 0) {
    return createErrorDraft(draftId, 'text', 'Could not parse food from text', mealType);
  }

  // Step 2: Resolve each food
  const items = [];
  for (const parsedFood of parsedFoods) {
    const resolvedItem = await resolveGenericFood(parsedFood);
    items.push(resolvedItem);
  }

  const dataQuality = assessDataQuality(items);

  return {
    draftId,
    mode: 'text',
    mealType,
    items,
    totals: calculateTotals(items),
    dataQuality,
    uiHints: generateUIHints(items, dataQuality)
  };
}

/**
 * PHOTO MODE RESOLVER
 * Pipeline: OpenAI vision → USDA/OFF search per detected food
 */
async function resolvePhotoMode(imageBase64, draftId, mealType) {
  // Step 1: Vision analysis
  const visionResult = await FoodService.analyzeImage(imageBase64);

  if (!visionResult || !visionResult.foods) {
    return createErrorDraft(draftId, 'photo', 'Could not detect food in image', mealType);
  }

  // Step 2: Resolve each detected food
  const items = [];
  for (const detectedFood of visionResult.foods) {
    const resolvedItem = await resolveGenericFood({
      name: detectedFood.name,
      quantity: detectedFood.estimatedAmount,
      unit: detectedFood.estimatedUnit,
      confidence: detectedFood.confidence
    });

    // Flag low-confidence detections
    if (detectedFood.confidence < 0.7) {
      resolvedItem.flags.push('low_confidence', 'portion_estimated');
    }

    items.push(resolvedItem);
  }

  const dataQuality = assessDataQuality(items);

  return {
    draftId,
    mode: 'photo',
    mealType,
    items,
    totals: calculateTotals(items),
    dataQuality,
    uiHints: generateUIHints(items, dataQuality)
  };
}

/**
 * RESOLVE GENERIC FOOD (text/photo parsed item)
 * Try USDA first, then OFF if packaged cue detected
 */
async function resolveGenericFood(parsedFood) {
  const sourceEvidence = [];
  const itemId = uuidv4();

  // Try USDA first (primary for generic foods)
  const usdaResults = await FoodService.searchUSDAByName(parsedFood.name);

  if (usdaResults && usdaResults.length > 0) {
    const bestMatch = selectBestUSDAMatch(usdaResults, parsedFood.name);

    sourceEvidence.push({
      source: 'USDA',
      sourceId: bestMatch.fdcId,
      confidence: bestMatch.matchScore,
      fetchedAt: new Date().toISOString(),
      fieldsProvided: ['macros', 'micros']
    });

    return {
      itemId,
      name: bestMatch.description,
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
      flags: parsedFood.quantity ? [] : ['portion_estimated']
    };
  }

  // Fallback: return with estimated flag
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
    flags: ['estimated_nutrients', 'portion_estimated']
  };
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
  // Simple keyword matching + nutrient completeness
  return results.reduce((best, current) => {
    const score = calculateMatchScore(current.description, query);
    if (!best || score > best.matchScore) {
      return { ...current, matchScore: score };
    }
    return best;
  }, null);
}

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

export default router;
