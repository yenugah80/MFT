import { foodLogTable, waterLogTable, moodLogTable } from "../db/schema.js";
import errors from "../utils/errorResponse.js";
import { clearPatternCache } from "../services/patternMiningService.js";
import { checkNutritionPlausibility, checkMacroConsistency } from "../services/nutritionPlausibilityChecker.js";

export async function logMeal(req, res) {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const {
      foodName,
      calories,
      protein,
      carbs,
      fats,
      fiber, // New: fiber in grams
      sugar, // New: sugar in grams
      sodium, // New: sodium in mg
      servingSize,
      mealType,
      micros,
      nutriscore,
      ecoscore,
      novaScore,
      dietLabels,
      allergens,
      ingredients,
      barcode,
      imageUrl,
      loggedDate,
      source,
    } = req.body;

    if (!foodName) {
      return errors.missingField(res, "foodName");
    }

    // Same universal macro-consistency + plausibility net as /nutrition/log — this is
    // a second live food-log write path, so it gets the same Atwater reconciliation,
    // calorie-density sanity check, and persisted audit trail (see
    // nutritionPlausibilityChecker.js). Non-blocking; reconciliation is deterministic.
    let effectiveCalories = calories;
    let macroReconciled = false;
    let originalCaloriesKcal = null;
    const macroConsistency = checkMacroConsistency({
      foodName,
      macros: { calories_kcal: calories, protein_g: protein, carbs_g: carbs, fat_g: fats, fiber_g: fiber },
    });
    if (!macroConsistency.consistent) {
      if (macroConsistency.shouldReconcile) {
        console.warn(
          `[LoggingController][macro] Reconciling calories for "${foodName}": stated ${calories} kcal vs ` +
          `${macroConsistency.calculatedCalories} kcal from macros (diff: ${macroConsistency.diffPercent.toFixed(1)}%)`
        );
        originalCaloriesKcal = calories;
        effectiveCalories = macroConsistency.calculatedCalories;
        macroReconciled = true;
      } else {
        console.warn(
          `[LoggingController][macro] Mismatch for "${foodName}" not reconciled (alcohol/sugar-alcohol ` +
          `calories aren't in the macro fields): stated ${calories} vs ${macroConsistency.calculatedCalories} kcal from macros`
        );
      }
    }

    const gramsFromLabel = (() => {
      const m = typeof servingSize === 'string' ? servingSize.match(/(\d+(?:\.\d+)?)\s*g\b/i) : null;
      return m ? parseFloat(m[1]) : undefined;
    })();
    const plausibility = checkNutritionPlausibility({
      foodName,
      macros: { calories_kcal: effectiveCalories },
      servingGrams: gramsFromLabel,
    });
    if (!plausibility.plausible) {
      console.warn(
        `[LoggingController][plausibility] IMPLAUSIBLE food="${foodName}" ${plausibility.kcalPer100g}kcal/100g ` +
        `expected=${plausibility.expectedRange.min}-${plausibility.expectedRange.max} ` +
        `tier=${plausibility.tier} severity=${plausibility.severity} source=${source || 'unknown'}`
      );
    }

    const result = await req.db
      .insert(foodLogTable)
      .values({
        userId,
        foodName,
        calories: effectiveCalories ?? null,
        protein: protein ?? null,
        carbs: carbs ?? null,
        fats: fats ?? null,
        fiber: fiber ?? null, // New: save fiber
        sugar: sugar ?? null, // New: save sugar
        sodium: sodium ?? null, // New: save sodium
        servingSize: servingSize ?? null,
        mealType: mealType ?? null,
        micros: micros ?? {},
        nutriscore: nutriscore ?? null,
        ecoscore: ecoscore ?? null,
        novaScore: novaScore ?? null,
        dietLabels: dietLabels ?? [],
        allergens: allergens ?? [],
        ingredients: ingredients ?? [],
        barcode: barcode ?? null,
        imageUrl: imageUrl ?? null,
        loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
        source,
        sourceMeta: {
          plausibility,
          macroReconciled,
          ...(macroReconciled ? { originalCaloriesKcal } : {}),
        },
      })
      .returning();

    if (!result || result.length === 0) {
      return errors.database(res, "insert meal log");
    }

    // Clear pattern cache for this user (new data invalidates cached patterns)
    clearPatternCache(userId);

    res.status(201).json(result[0]);
  } catch (err) {
    console.error("[LoggingController] Error logging meal:", err);
    return errors.internal(res, "Failed to log meal");
  }
}

export async function logWater(req, res) {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { amountLiters } = req.body;
    const parsed = parseFloat(amountLiters);

    if (Number.isNaN(parsed) || parsed <= 0) {
      return errors.invalidValue(res, "amountLiters", "must be a positive number");
    }

    const result = await req.db
      .insert(waterLogTable)
      .values({
        userId,
        amountLiters: parsed,
      })
      .returning();

    if (!result || result.length === 0) {
      return errors.database(res, "insert water log");
    }

    // Clear pattern cache for this user (new data invalidates cached patterns)
    clearPatternCache(userId);

    res.status(201).json(result[0]);
  } catch (err) {
    console.error("[LoggingController] Error logging water:", err);
    return errors.internal(res, "Failed to log water intake");
  }
}

export async function logMood(req, res) {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { mood, note, source } = req.body;

    if (!mood) {
      return errors.missingField(res, "mood");
    }

    const result = await req.db
      .insert(moodLogTable)
      .values({
        userId,
        mood,
        note,
        source,
      })
      .returning();

    if (!result || result.length === 0) {
      return errors.database(res, "insert mood log");
    }

    // Clear pattern cache for this user (new data invalidates cached patterns)
    clearPatternCache(userId);

    res.status(201).json(result[0]);
  } catch (err) {
    console.error("[LoggingController] Error logging mood:", err);
    return errors.internal(res, "Failed to log mood");
  }
}
