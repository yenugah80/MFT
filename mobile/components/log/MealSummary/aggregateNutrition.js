/**
 * Pure nutrition-aggregation logic for the Detailed Analysis screen, kept
 * separate from MealSummaryScreen.jsx (which pulls in React Native / expo
 * native modules) so this can be unit-tested without an RN rendering
 * environment.
 */

/**
 * Extract sodium from micros object (handles multiple formats)
 * Returns sodium value in mg, or 0 if not found
 */
export function extractSodiumFromMicros(micros) {
  if (!micros) return 0;

  // Try various key formats: sodium, sodium_mg, Sodium
  const sodiumKeys = ['sodium', 'sodium_mg', 'Sodium'];
  for (const key of sodiumKeys) {
    const val = micros[key];
    if (val !== undefined && val !== null) {
      // Handle both {sodium: 1700} and {sodium: {value: 1700}}
      if (typeof val === 'object' && val.value !== undefined) {
        return val.value;
      }
      if (typeof val === 'number') {
        return val;
      }
    }
  }
  return 0;
}

/**
 * Aggregate nutrition data from multiple items
 * FIX: Ensures sodium from micros is copied to macros for consistent display
 */
export function aggregateNutrition(analysisResult) {
  if (!analysisResult?.items || analysisResult.items.length === 0) {
    return null;
  }

  // Single item - return directly
  if (analysisResult.items.length === 1) {
    const item = analysisResult.items[0];
    const macros = { ...(item.macros || {}) };
    const micros = item.micros || {};

    // FIX: If sodium_mg is missing or 0 in macros, copy from micros
    if (!macros.sodium_mg || macros.sodium_mg === 0) {
      const sodiumFromMicros = extractSodiumFromMicros(micros);
      if (sodiumFromMicros > 0) {
        macros.sodium_mg = sodiumFromMicros;
      }
    }

    return {
      item,
      macros,
      micros,
      ingredients: item.ingredients || [],
      isComplex: item.isComplex || false,
      name: item.name,
      portion: item.portion,
      confidence: item.confidence,
    };
  }

  // Multiple items - use totals
  const totals = analysisResult.totals || {};
  // Names aggregation available if needed for display
  // const names = analysisResult.items.map(i => i.name).join(', ');

  // Backend now always sends totals.micros already unit-normalized and
  // summed across every item (canonicalNutrition.js:aggregateCanonicalTotals,
  // used by every input mode). Prefer it. The independent per-item
  // re-aggregation below is kept only as a fallback for a cached
  // analysisResult from before that fix (backward compatibility), or the
  // rare case totals.micros is genuinely empty.
  const hasCanonicalMicros = totals.micros && Object.keys(totals.micros).length > 0;
  const aggregatedMicros = hasCanonicalMicros ? totals.micros : {};
  if (!hasCanonicalMicros) {
    analysisResult.items.forEach(item => {
      if (item.micros) {
        Object.entries(item.micros).forEach(([key, val]) => {
          // Handle both flat numbers and object format
          const isObject = typeof val === 'object' && val !== null;
          const value = isObject ? (val.value ?? 0) : (typeof val === 'number' ? val : 0);
          const unit = isObject ? (val.unit || 'mg') : 'mg';

          if (!aggregatedMicros[key]) {
            aggregatedMicros[key] = { value: 0, unit };
          }
          aggregatedMicros[key].value += value;
        });
      }
    });
  }

  // FIX: Ensure macros has sodium_mg from micros if missing (defensive —
  // resolve.js/food.js/voiceLog.js now always populate this via the same
  // canonical aggregator, so this should be a no-op on current data)
  const macros = { ...(totals.macros || {}) };
  if (!macros.sodium_mg || macros.sodium_mg === 0) {
    const sodiumFromMicros = extractSodiumFromMicros(aggregatedMicros);
    if (sodiumFromMicros > 0) {
      macros.sodium_mg = sodiumFromMicros;
    }
  }

  // Meal-level average confidence, not just the first item's — a low-
  // confidence second item shouldn't be hidden behind a confident first one,
  // or vice versa.
  const avgConfidence = analysisResult.items.reduce((sum, i) => sum + (i.confidence ?? 0.7), 0) / analysisResult.items.length;

  return {
    // Synthetic whole-meal "item" for consumers (MealScoreDial) that expect
    // a single {macros, micros, confidence} shape — this used to be
    // analysisResult.items[0], silently scoring only the first ingredient
    // of a multi-item meal instead of the meal as analyzed.
    item: { macros, micros: aggregatedMicros, confidence: avgConfidence },
    macros,
    micros: aggregatedMicros,
    ingredients: analysisResult.items, // Use items as "ingredients" for multi-item meals
    isComplex: true,
    name: `Meal (${analysisResult.items.length} items)`,
    portion: { servingText: `${analysisResult.items.length} items` },
    confidence: avgConfidence,
  };
}

/**
 * Build the payload sent to POST /predictions/meal-feeling. Fiber and sugar
 * live under `displayMacros.fiber_g`/`sugar_g` — previously this read
 * `nutrition.micros?.fiber`/`sugar`, which never existed there, so the
 * crash-risk predictor received undefined for both on effectively every
 * meal (predictionEngineService defaults missing fiber/sugar to 0
 * server-side), making `hasGoodFiber` structurally false regardless of the
 * meal's real fiber content.
 */
/**
 * Scale a resolved item's complete macros/micros by a quantity ratio (e.g.
 * 2 rotis -> 3 rotis is scaleFactor 1.5). Used by the quantity-adjuster flow.
 *
 * Previously, changing quantity replaced the whole macros object with
 * QuantityAdjuster's own recompute — which only knows 4 fields
 * (protein/carbs/fat/fiber, unsuffixed) because that's all
 * countableFoods.js's static per-unit config defines; it has no per-unit
 * sugar/sodium data to scale from at all. That replacement wiped sugar_g/
 * sodium_mg to undefined and used the wrong key convention for the other
 * four, so every macro bar except calories silently zeroed out after any
 * quantity edit, and the (undefined) result also corrupted the meal-feeling
 * prediction payload. Scaling the ORIGINAL complete macros/micros object by
 * the quantity ratio covers every field this app actually knows about,
 * whether or not QuantityAdjuster's static config has per-unit data for it.
 */
export function scaleNutritionByQuantity(macros, micros, scaleFactor) {
  // Whole numbers, not 2-decimal — foodLogTable's macro columns are all
  // `integer` in the schema, so a value shown here to 2 decimal places
  // during quantity editing (e.g. "82.5") never matches what actually gets
  // saved a moment later ("83"). Round to what will actually persist, once,
  // here — not differently at every display point downstream. Micros stay
  // unrounded: they persist as a flexible JSON column, no integer mismatch.
  const scaledMacros = {};
  for (const [key, value] of Object.entries(macros || {})) {
    scaledMacros[key] = typeof value === 'number' ? Math.round(value * scaleFactor) : value;
  }

  const scaledMicros = {};
  for (const [key, entry] of Object.entries(micros || {})) {
    if (entry && typeof entry === 'object' && typeof entry.value === 'number') {
      scaledMicros[key] = { ...entry, value: Math.round(entry.value * scaleFactor * 100) / 100 };
    } else if (typeof entry === 'number') {
      scaledMicros[key] = Math.round(entry * scaleFactor * 100) / 100;
    } else {
      scaledMicros[key] = entry;
    }
  }

  return { macros: scaledMacros, micros: scaledMicros };
}

export function buildMealFeelingPayload({ displayCalories, displayMacros, item }) {
  return {
    calories: displayCalories,
    protein: displayMacros?.protein_g,
    carbs: displayMacros?.carbs_g,
    sugar: displayMacros?.sugar_g,
    fiber: displayMacros?.fiber_g,
    novaScore: item?.novaScore,
    mealType: item?.mealType,
  };
}
