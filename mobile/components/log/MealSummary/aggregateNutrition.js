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
 * The reverse of extractSodiumFromMicros: the LLM schema puts sodium under
 * `macros` only (nutritionAnalysis.js's micros schema never asks for it), so
 * `micros.sodium` never exists coming off the backend — MicrosGrid.jsx, which
 * only ever reads the `micros` prop, always showed "Sodium: Not detected"
 * despite a real value sitting in macros.sodium_mg. Sync it across so sodium
 * displays like any other detected micronutrient. Never overwrites an
 * existing micros.sodium (e.g. a future resolver path that does report it).
 */
export function syncSodiumIntoMicros(macros, micros) {
  if (micros?.sodium !== undefined && micros?.sodium !== null) return micros;
  const sodiumMg = macros?.sodium_mg;
  if (typeof sodiumMg !== 'number' || sodiumMg <= 0) return micros;
  return { ...micros, sodium: { value: sodiumMg, unit: 'mg' } };
}

/**
 * Aggregate nutrition data from multiple items
 * FIX: Ensures sodium from micros is copied to macros for consistent display
 *
 * @param {object} analysisResult
 * @param {object} [exclusions] - excludedItems: Set of item array indices to
 *   drop entirely; excludedIngredients: Set of "itemIndex-ingredientIndex"
 *   keys whose macros get subtracted from their parent item. Same keying
 *   convention UnifiedMealAnalysis.jsx's calculatedTotals already uses, so
 *   both screens can be driven by identical exclusion state — this was
 *   previously a MealSummaryScreen-only function with no concept of
 *   exclusions at all, meaning it always summed the FULL unedited meal even
 *   after a user excluded something on the analysis screen, a real
 *   cross-screen divergence for any meal with an active exclusion.
 */
export function aggregateNutrition(analysisResult, exclusions = {}) {
  if (!analysisResult?.items || analysisResult.items.length === 0) {
    return null;
  }

  const excludedItems = exclusions.excludedItems || new Set();
  const excludedIngredients = exclusions.excludedIngredients || new Set();

  // Single item - return directly, still respecting ingredient-level
  // exclusions (a single dish can have its own excluded sub-ingredients,
  // e.g. unchecking "curry sauce" on a standalone "chicken curry" item —
  // exclusion isn't exclusively a multi-item-meal concept).
  if (analysisResult.items.length === 1) {
    const item = analysisResult.items[0];
    const macros = { ...(item.macros || {}) };
    let micros = item.micros || {};
    const allIngredients = item.ingredients || [];
    const activeIngredients = [];

    let calories = macros.calories_kcal ?? macros.calories ?? 0;
    let protein = macros.protein_g ?? macros.protein ?? 0;
    let carbs = macros.carbs_g ?? macros.carbs ?? 0;
    let fat = macros.fat_g ?? macros.fat ?? 0;
    let fiber = macros.fiber_g ?? macros.fiber ?? 0;
    let sugar = macros.sugar_g ?? macros.sugar ?? 0;

    allIngredients.forEach((ing, ingIdx) => {
      const ingKey = `0-${ingIdx}`;
      if (excludedIngredients.has(ingKey)) {
        calories -= ing.calories || 0;
        protein -= ing.protein || 0;
        carbs -= ing.carbs || 0;
        fat -= ing.fat || 0;
        fiber -= ing.fiber || 0;
        sugar -= ing.sugar || 0;
      } else {
        activeIngredients.push(ing);
      }
    });

    if (excludedIngredients.size > 0) {
      macros.calories_kcal = Math.max(0, calories);
      macros.protein_g = Math.max(0, protein);
      macros.carbs_g = Math.max(0, carbs);
      macros.fat_g = Math.max(0, fat);
      macros.fiber_g = Math.max(0, fiber);
      macros.sugar_g = Math.max(0, sugar);
    }

    // FIX: If sodium_mg is missing or 0 in macros, copy from micros
    if (!macros.sodium_mg || macros.sodium_mg === 0) {
      const sodiumFromMicros = extractSodiumFromMicros(micros);
      if (sodiumFromMicros > 0) {
        macros.sodium_mg = sodiumFromMicros;
      }
    }
    micros = syncSodiumIntoMicros(macros, micros);

    return {
      item,
      macros,
      micros,
      ingredients: activeIngredients,
      isComplex: item.isComplex || false,
      name: item.name,
      portion: item.portion,
      confidence: item.confidence,
    };
  }

  // Multiple items
  // Names aggregation available if needed for display
  // const names = analysisResult.items.map(i => i.name).join(', ');

  const activeEntries = analysisResult.items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => !excludedItems.has(index));

  // Macros: sum active items' own macros, then subtract any excluded
  // ingredient's share (same fields, same non-negative clamping
  // UnifiedMealAnalysis.jsx's calculatedTotals already applies — sodium is
  // deliberately not reduced by ingredient exclusion there either, since
  // per-ingredient sodium isn't tracked reliably enough to subtract).
  const macros = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };
  // fiber/sugar/sodium are optional per item (unlike the four required
  // macros, which the backend always validates as numeric) — if ANY active
  // item never reported one, the summed total below is an undercount, not
  // a true total, so it's nulled out afterward rather than shown as a
  // precise-looking number. Was previously always a plain sum (missing
  // treated as a silent 0 contribution), so a meal with one item's sodium
  // genuinely unknown could still show a confident-looking total.
  let fiberIncomplete = false;
  let sugarIncomplete = false;
  let sodiumIncomplete = false;
  // Micros: always summed fresh from active items rather than trusting a
  // separately-carried `totals.micros` snapshot, for the same reason macros
  // stopped trusting `totals.macros` above — a snapshot from when analysis
  // first completed isn't guaranteed to reflect a later exclusion.
  const aggregatedMicros = {};
  // Real per-item ingredients, flattened and tagged with their parent item's
  // name. Previously this branch handed IngredientsSection the top-level
  // `items` array itself (`ingredients: analysisResult.items`) — meaning
  // Detailed Analysis never showed a multi-item meal's real sub-ingredients
  // at all, only single-item meals (branch above) did.
  const flattenedIngredients = [];

  activeEntries.forEach(({ item, index }) => {
    const itemMacros = item.macros || {};
    let itemCalories = itemMacros.calories_kcal ?? itemMacros.calories ?? 0;
    let itemProtein = itemMacros.protein_g ?? itemMacros.protein ?? 0;
    let itemCarbs = itemMacros.carbs_g ?? itemMacros.carbs ?? 0;
    let itemFat = itemMacros.fat_g ?? itemMacros.fat ?? 0;
    if (itemMacros.fiber_g == null && itemMacros.fiber == null) fiberIncomplete = true;
    if (itemMacros.sugar_g == null && itemMacros.sugar == null) sugarIncomplete = true;
    let itemFiber = itemMacros.fiber_g ?? itemMacros.fiber ?? 0;
    let itemSugar = itemMacros.sugar_g ?? itemMacros.sugar ?? 0;

    (item.ingredients || []).forEach((ing, ingIdx) => {
      const ingKey = `${index}-${ingIdx}`;
      if (excludedIngredients.has(ingKey)) {
        itemCalories -= ing.calories || 0;
        itemProtein -= ing.protein || 0;
        itemCarbs -= ing.carbs || 0;
        itemFat -= ing.fat || 0;
        itemFiber -= ing.fiber || 0;
        itemSugar -= ing.sugar || 0;
      } else {
        flattenedIngredients.push({ ...ing, name: `${item.name}: ${ing.name}` });
      }
    });

    macros.calories_kcal += Math.max(0, itemCalories);
    macros.protein_g += Math.max(0, itemProtein);
    macros.carbs_g += Math.max(0, itemCarbs);
    macros.fat_g += Math.max(0, itemFat);
    macros.fiber_g += Math.max(0, itemFiber);
    macros.sugar_g += Math.max(0, itemSugar);

    const sodiumMissingFromMacros = itemMacros.sodium_mg == null && itemMacros.sodium == null;
    let itemSodium = itemMacros.sodium_mg ?? itemMacros.sodium ?? 0;
    if (itemSodium === 0) {
      itemSodium = extractSodiumFromMicros(item.micros);
    }
    if (sodiumMissingFromMacros && itemSodium === 0) sodiumIncomplete = true;
    macros.sodium_mg += itemSodium;

    Object.entries(item.micros || {}).forEach(([key, val]) => {
      const isObject = typeof val === 'object' && val !== null;
      const value = isObject ? (val.value ?? 0) : (typeof val === 'number' ? val : 0);
      const unit = isObject ? (val.unit || 'mg') : 'mg';
      if (!aggregatedMicros[key]) {
        aggregatedMicros[key] = { value: 0, unit };
      }
      aggregatedMicros[key].value += value;
    });
  });

  // An incomplete field's sum is an undercount, not a real total — null it
  // out rather than display a confident-looking number built from partial
  // data. (Zero contributions from items that reported these fields, but
  // reported them as an actual 0, are NOT what marks a field incomplete —
  // only a genuinely missing/null value on some item does.)
  if (fiberIncomplete) macros.fiber_g = null;
  if (sugarIncomplete) macros.sugar_g = null;
  if (sodiumIncomplete) macros.sodium_mg = null;

  const finalMicros = syncSodiumIntoMicros(macros, aggregatedMicros);

  // Meal-level average confidence over active items only, not just the
  // first item's — a low-confidence second item shouldn't be hidden behind
  // a confident first one, or vice versa.
  const avgConfidence = activeEntries.length > 0
    ? activeEntries.reduce((sum, { item }) => sum + (item.confidence ?? 0.7), 0) / activeEntries.length
    : 0.7;

  return {
    // Synthetic whole-meal "item" for consumers (MealScoreDial) that expect
    // a single {macros, micros, confidence} shape — this used to be
    // analysisResult.items[0], silently scoring only the first ingredient
    // of a multi-item meal instead of the meal as analyzed.
    item: { macros, micros: finalMicros, confidence: avgConfidence },
    macros,
    micros: finalMicros,
    ingredients: flattenedIngredients,
    isComplex: true,
    name: `Meal (${activeEntries.length} item${activeEntries.length === 1 ? '' : 's'})`,
    portion: { servingText: `${activeEntries.length} item${activeEntries.length === 1 ? '' : 's'}` },
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
