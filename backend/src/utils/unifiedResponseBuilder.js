/**
 * Unified Response Builder
 *
 * Creates consistent response structure across ALL input modes:
 * - Voice, Text, Photo, Barcode
 *
 * COMPETITIVE ADVANTAGES:
 * 1. Ingredient-level breakdown for complex dishes
 * 2. Cooking method awareness (fried vs steamed)
 * 3. Health Score + NutriScore + Smart Tips
 * 4. Confidence transparency (AI vs Verified)
 * 5. One-input multi-item analysis
 */

import crypto from 'crypto';

/**
 * Standardized field names (NO suffixes like _kcal or _g)
 */
const NUTRITION_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];

/**
 * Generate stable ID for items
 */
function generateItemId(name, index) {
  return crypto
    .createHash('sha1')
    .update(`${name}:${index}:${Date.now()}`)
    .digest('hex')
    .slice(0, 12);
}

/**
 * Normalize nutrition data to standard field names
 * Handles legacy field names from different sources
 */
function normalizeNutrition(raw) {
  if (!raw) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

  return {
    calories: raw.calories ?? raw.calories_kcal ?? raw.kcal ?? 0,
    protein: raw.protein ?? raw.protein_g ?? raw.proteins ?? 0,
    carbs: raw.carbs ?? raw.carbs_g ?? raw.carbohydrates ?? 0,
    fat: raw.fat ?? raw.fat_g ?? raw.fats ?? 0,
    fiber: raw.fiber ?? raw.fiber_g ?? 0,
    sugar: raw.sugar ?? raw.sugar_g ?? raw.sugars ?? 0,
    sodium: raw.sodium ?? raw.sodium_mg ?? 0
  };
}

/**
 * Calculate per-unit nutrition for quantity adjustments
 */
function calculatePerUnitNutrition(nutrition, quantity) {
  if (!quantity || quantity <= 0) quantity = 1;

  return {
    calories: Math.round(nutrition.calories / quantity),
    protein: Math.round((nutrition.protein / quantity) * 10) / 10,
    carbs: Math.round((nutrition.carbs / quantity) * 10) / 10,
    fat: Math.round((nutrition.fat / quantity) * 10) / 10,
    fiber: Math.round((nutrition.fiber / quantity) * 10) / 10,
    sugar: Math.round((nutrition.sugar / quantity) * 10) / 10,
    sodium: Math.round(nutrition.sodium / quantity)
  };
}

/**
 * Calculate totals from items array
 */
function calculateTotals(items) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

  items.forEach(item => {
    const nutrition = item.nutrition || {};
    totals.calories += nutrition.calories || 0;
    totals.protein += nutrition.protein || 0;
    totals.carbs += nutrition.carbs || 0;
    totals.fat += nutrition.fat || 0;
    totals.fiber += nutrition.fiber || 0;
    totals.sugar += nutrition.sugar || 0;
    totals.sodium += nutrition.sodium || 0;
  });

  // Round values
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  totals.fiber = Math.round(totals.fiber * 10) / 10;
  totals.sugar = Math.round(totals.sugar * 10) / 10;
  totals.calories = Math.round(totals.calories);
  totals.sodium = Math.round(totals.sodium);

  return totals;
}

/**
 * Calculate overall health score from items
 */
function calculateOverallHealthScore(items) {
  if (!items.length) return 50;

  const scores = items
    .filter(item => item.healthScore != null)
    .map(item => item.healthScore);

  if (scores.length === 0) return 50;

  // Weighted by calories
  const totalCalories = items.reduce((sum, item) => sum + (item.nutrition?.calories || 0), 0);
  if (totalCalories === 0) return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  let weightedSum = 0;
  items.forEach(item => {
    if (item.healthScore != null) {
      const weight = (item.nutrition?.calories || 0) / totalCalories;
      weightedSum += item.healthScore * weight;
    }
  });

  return Math.round(weightedSum);
}

/**
 * Calculate NutriScore (A-E) from actual nutrition data
 * Based on the official French/European NutriScore algorithm
 *
 * The calculation assumes nutrition values are per 100g/100ml equivalent
 * We normalize from per-serving to per-100g estimate
 */
function calculateNutriScore(nutrition, servingGrams = 100) {
  if (!nutrition || !nutrition.calories) {
    return { grade: 'C', score: 5 }; // Default middle score
  }

  // Normalize to per-100g basis for NutriScore calculation
  const normFactor = 100 / (servingGrams || 100);
  const energyKcal = (nutrition.calories || 0) * normFactor;
  const energyKj = energyKcal * 4.184;
  const sugars = (nutrition.sugar || 0) * normFactor;
  const satFat = ((nutrition.fat || 0) * 0.4) * normFactor; // Estimate: ~40% of fat is saturated
  const sodium = (nutrition.sodium || 0) * normFactor;
  const fiber = (nutrition.fiber || 0) * normFactor;
  const protein = (nutrition.protein || 0) * normFactor;

  // NEGATIVE POINTS (0-10 each, total max 40)
  const energyScore = scoreNegativeEnergy(energyKj);
  const sugarScore = scoreNegativeSugars(sugars);
  const satFatScore = scoreNegativeSatFat(satFat);
  const sodiumScore = scoreNegativeSodium(sodium);

  // POSITIVE POINTS (0-5 each, total max 15)
  const fiberScore = scorePositiveFiber(fiber);
  const proteinScore = scorePositiveProtein(protein);
  const fruitsScore = 0; // We don't have fruit/veg data, so default to 0

  const totalNegative = energyScore + sugarScore + satFatScore + sodiumScore;
  const totalPositive = fiberScore + proteinScore + fruitsScore;

  // Final score: lower is better
  const finalScore = totalNegative - totalPositive;
  const grade = scoreToNutriGrade(finalScore);

  return { grade, score: finalScore };
}

// Negative scoring functions (0-10 points each)
function scoreNegativeEnergy(kj) {
  if (kj == null || kj <= 335) return 0;
  if (kj <= 670) return 1;
  if (kj <= 1005) return 2;
  if (kj <= 1340) return 3;
  if (kj <= 1675) return 4;
  if (kj <= 2010) return 5;
  if (kj <= 2345) return 6;
  if (kj <= 2680) return 7;
  if (kj <= 3015) return 8;
  if (kj <= 3350) return 9;
  return 10;
}

function scoreNegativeSugars(g) {
  if (g == null || g <= 4.5) return 0;
  if (g <= 9) return 1;
  if (g <= 13.5) return 2;
  if (g <= 18) return 3;
  if (g <= 22.5) return 4;
  if (g <= 27) return 5;
  if (g <= 31) return 6;
  if (g <= 36) return 7;
  if (g <= 40) return 8;
  if (g <= 45) return 9;
  return 10;
}

function scoreNegativeSatFat(g) {
  if (g == null || g <= 1) return 0;
  if (g <= 2) return 1;
  if (g <= 3) return 2;
  if (g <= 4) return 3;
  if (g <= 5) return 4;
  if (g <= 6) return 5;
  if (g <= 7) return 6;
  if (g <= 8) return 7;
  if (g <= 9) return 8;
  if (g <= 10) return 9;
  return 10;
}

function scoreNegativeSodium(mg) {
  if (mg == null || mg <= 90) return 0;
  if (mg <= 180) return 1;
  if (mg <= 270) return 2;
  if (mg <= 360) return 3;
  if (mg <= 450) return 4;
  if (mg <= 540) return 5;
  if (mg <= 630) return 6;
  if (mg <= 720) return 7;
  if (mg <= 810) return 8;
  if (mg <= 900) return 9;
  return 10;
}

// Positive scoring functions (0-5 points each)
function scorePositiveFiber(g) {
  if (g == null || g <= 0.9) return 0;
  if (g <= 1.9) return 1;
  if (g <= 2.8) return 2;
  if (g <= 3.7) return 3;
  if (g <= 4.7) return 4;
  return 5;
}

function scorePositiveProtein(g) {
  if (g == null || g <= 1.6) return 0;
  if (g <= 3.2) return 1;
  if (g <= 4.8) return 2;
  if (g <= 6.4) return 3;
  if (g <= 8) return 4;
  return 5;
}

function scoreToNutriGrade(score) {
  if (score == null || Number.isNaN(score)) return 'C';
  if (score <= -1) return 'A';
  if (score <= 2) return 'B';
  if (score <= 10) return 'C';
  if (score <= 18) return 'D';
  return 'E';
}

/**
 * Calculate health score (0-100) from nutrition data
 * Higher is healthier
 */
function calculateHealthScoreFromNutrition(nutrition, cookingMethod = null) {
  if (!nutrition || !nutrition.calories) return 50;

  let score = 50; // Start at neutral

  const calories = nutrition.calories || 0;
  const protein = nutrition.protein || 0;
  const carbs = nutrition.carbs || 0;
  const fat = nutrition.fat || 0;
  const fiber = nutrition.fiber || 0;
  const sugar = nutrition.sugar || 0;
  const sodium = nutrition.sodium || 0;

  // Protein ratio bonus (protein should be 15-35% of calories)
  const proteinCalPercent = (protein * 4) / calories * 100;
  if (proteinCalPercent >= 20 && proteinCalPercent <= 35) score += 15;
  else if (proteinCalPercent >= 15) score += 10;
  else if (proteinCalPercent < 10) score -= 5;

  // Fiber bonus (aim for 10+ grams)
  if (fiber >= 10) score += 15;
  else if (fiber >= 5) score += 10;
  else if (fiber >= 3) score += 5;

  // Sugar penalty (aim for <10% of calories from sugar)
  const sugarCalPercent = (sugar * 4) / calories * 100;
  if (sugarCalPercent > 25) score -= 20;
  else if (sugarCalPercent > 15) score -= 10;
  else if (sugarCalPercent <= 5) score += 5;

  // Fat ratio (should be 20-35% of calories)
  const fatCalPercent = (fat * 9) / calories * 100;
  if (fatCalPercent > 40) score -= 15;
  else if (fatCalPercent > 35) score -= 5;
  else if (fatCalPercent >= 20 && fatCalPercent <= 35) score += 5;

  // Sodium penalty (aim for <600mg per meal)
  if (sodium > 1500) score -= 20;
  else if (sodium > 1000) score -= 10;
  else if (sodium > 600) score -= 5;
  else if (sodium <= 300) score += 5;

  // Cooking method adjustments
  if (cookingMethod) {
    switch (cookingMethod.toLowerCase()) {
      case 'fried':
      case 'deep-fried':
        score -= 15;
        break;
      case 'steamed':
      case 'boiled':
      case 'raw':
        score += 10;
        break;
      case 'grilled':
      case 'baked':
        score += 5;
        break;
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Legacy fallback: Convert health score to NutriScore if we only have healthScore
 */
function healthScoreToNutriScore(healthScore) {
  if (healthScore >= 80) return 'A';
  if (healthScore >= 60) return 'B';
  if (healthScore >= 40) return 'C';
  if (healthScore >= 20) return 'D';
  return 'E';
}

/**
 * Generate health analysis text
 */
function generateHealthAnalysis(totals, items) {
  const insights = [];

  // Protein analysis
  if (totals.protein >= 30) {
    insights.push('High protein');
  } else if (totals.protein >= 15) {
    insights.push('Good protein');
  }

  // Fiber analysis
  if (totals.fiber >= 10) {
    insights.push('excellent fiber');
  } else if (totals.fiber >= 5) {
    insights.push('good fiber');
  }

  // Fat analysis
  const fatCaloriePercent = (totals.fat * 9) / totals.calories * 100;
  if (fatCaloriePercent > 40) {
    insights.push('high fat content');
  }

  // Sodium analysis
  if (totals.sodium > 1000) {
    insights.push('watch sodium');
  }

  // Cooking method insights
  const friedItems = items.filter(i => i.cookingMethod === 'fried');
  if (friedItems.length > 0) {
    insights.push('includes fried items');
  }

  return insights.length > 0
    ? insights.join(', ').charAt(0).toUpperCase() + insights.join(', ').slice(1)
    : 'Balanced meal';
}

/**
 * Generate smart suggestions based on meal analysis
 */
function generateSmartSuggestions(items, totals) {
  const suggestions = [];

  // Check for fried items
  const friedItems = items.filter(i => i.cookingMethod === 'fried');
  friedItems.forEach(item => {
    const savedCalories = Math.round((item.nutrition?.calories || 0) * 0.3);
    suggestions.push({
      type: 'healthier_swap',
      title: `Try ${item.name} steamed instead`,
      description: `Steaming instead of frying could save ~${savedCalories} calories`,
      calorieImpact: -savedCalories,
      healthScoreImpact: 10
    });
  });

  // Check for high sodium
  if (totals.sodium > 1500) {
    suggestions.push({
      type: 'nutrition_insight',
      title: 'High sodium meal',
      description: 'This meal is high in sodium. Consider reducing salt or choosing low-sodium options.',
      calorieImpact: 0,
      healthScoreImpact: -5
    });
  }

  // Protein tip
  if (totals.protein < 15 && totals.calories > 400) {
    suggestions.push({
      type: 'portion_tip',
      title: 'Add protein',
      description: 'Adding eggs, chicken, or legumes can improve satiety and nutrition balance.',
      calorieImpact: 100,
      healthScoreImpact: 15
    });
  }

  return suggestions.slice(0, 2); // Max 2 suggestions
}

/**
 * Build a standardized food item
 */
export function buildFoodItem(raw, index = 0) {
  const quantity = raw.quantity || raw.portion?.amount || 1;
  const unit = raw.unit || raw.portion?.unit || 'serving';
  const name = raw.name || raw.foodName || 'Unknown Food';

  // Normalize nutrition
  const rawNutrition = raw.nutrition || raw.macros || raw.canonical?.nutrition || raw;
  const nutrition = normalizeNutrition(rawNutrition);

  // Multiply by quantity if nutrition is per-unit
  const isPerUnit = raw.nutritionIsPerUnit !== false;
  const totalNutrition = isPerUnit ? {
    calories: Math.round(nutrition.calories * quantity),
    protein: Math.round(nutrition.protein * quantity * 10) / 10,
    carbs: Math.round(nutrition.carbs * quantity * 10) / 10,
    fat: Math.round(nutrition.fat * quantity * 10) / 10,
    fiber: Math.round(nutrition.fiber * quantity * 10) / 10,
    sugar: Math.round(nutrition.sugar * quantity * 10) / 10,
    sodium: Math.round(nutrition.sodium * quantity)
  } : nutrition;

  // Get cooking method for health score calculation
  const cookingMethod = raw.cookingMethod || raw.canonical?.cookingMethod || null;

  // Calculate health score if not provided (using per-unit nutrition for accuracy)
  let healthScore = raw.healthScore ?? raw.canonical?.healthScore ?? null;
  if (healthScore === null && nutrition.calories > 0) {
    healthScore = calculateHealthScoreFromNutrition(nutrition, cookingMethod);
  }

  // Calculate NutriScore if not provided
  let nutriScore = raw.nutriScore ?? raw.canonical?.nutriScore ?? null;
  let nutriScoreValue = null;
  if (nutriScore === null && nutrition.calories > 0) {
    const nutriScoreResult = calculateNutriScore(nutrition);
    nutriScore = nutriScoreResult.grade;
    nutriScoreValue = nutriScoreResult.score;
  }

  return {
    itemId: raw.id || raw.itemId || generateItemId(name, index),
    name: name,
    displayName: quantity > 1 ? `${name} (×${quantity})` : name,
    quantity: quantity,
    unit: unit,

    // Portion object for frontend compatibility
    portion: {
      amount: quantity,
      unit: unit,
      servingText: `${quantity} ${unit}`
    },

    // Nutrition for total quantity (standardized field names)
    nutrition: totalNutrition,

    // Macros with legacy field names for frontend compatibility
    macros: {
      calories_kcal: totalNutrition.calories,
      protein_g: totalNutrition.protein,
      carbs_g: totalNutrition.carbs,
      fat_g: totalNutrition.fat,
      fiber_g: totalNutrition.fiber,
      sugar_g: totalNutrition.sugar,
      sodium_mg: totalNutrition.sodium
    },

    // Per-unit nutrition for quantity adjustments
    perUnitNutrition: isPerUnit ? nutrition : calculatePerUnitNutrition(nutrition, quantity),

    // Ingredient breakdown (our differentiator!)
    ingredients: raw.ingredients || raw.canonical?.ingredients || [],

    // Cooking & Origin
    cookingMethod: cookingMethod,
    cuisine: raw.cuisine || raw.canonical?.cuisine || null,

    // Item-level health scores (ALWAYS CALCULATED if not provided)
    healthScore: healthScore,
    nutriScore: nutriScore,
    nutriScoreValue: nutriScoreValue,

    // Micronutrients
    micros: raw.micros || raw.canonical?.nutrition?.micros || {},

    // Data quality
    confidence: raw.confidence ?? 0.7,
    source: raw.source || 'ai_estimate',
    isEstimated: raw.source === 'ai_estimate' || raw.source === 'ai_estimated' || raw.isEstimated === true
  };
}

/**
 * Build unified meal analysis response
 *
 * @param {Object} params
 * @param {string} params.inputText - Original user input
 * @param {string} params.inputMode - 'voice' | 'text' | 'photo' | 'barcode'
 * @param {string} params.mealType - 'breakfast' | 'lunch' | 'dinner' | 'snack'
 * @param {Array} params.rawItems - Raw food items from AI/DB
 * @returns {Object} Unified meal analysis response
 */
export function buildUnifiedResponse({ inputText, inputMode, mealType, rawItems }) {
  // Build standardized items
  const items = (rawItems || []).map((raw, idx) => buildFoodItem(raw, idx));

  // Calculate totals (always server-side!)
  const totals = calculateTotals(items);

  // Calculate health score using weighted average from items OR from totals
  let healthScore = calculateOverallHealthScore(items);
  if (healthScore === 50 && items.length > 0) {
    // If we got default score, calculate from totals instead
    const avgCookingMethod = items.find(i => i.cookingMethod)?.cookingMethod || null;
    healthScore = calculateHealthScoreFromNutrition(totals, avgCookingMethod);
  }

  // Calculate NutriScore from totals (proper European algorithm)
  const nutriScoreResult = calculateNutriScore(totals);
  const nutriScore = nutriScoreResult.grade;
  const nutriScoreValue = nutriScoreResult.score;

  const healthAnalysis = generateHealthAnalysis(totals, items);

  // Generate smart suggestions
  const suggestions = generateSmartSuggestions(items, totals);

  // Calculate data quality metrics
  const verifiedItems = items.filter(i => !i.isEstimated);
  const estimatedItems = items.filter(i => i.isEstimated);
  const avgConfidence = items.length > 0
    ? items.reduce((sum, i) => sum + i.confidence, 0) / items.length
    : 0;

  return {
    // Meal Summary
    mealId: crypto.randomUUID(),
    inputText: inputText || '',
    inputMode: inputMode || 'text',
    timestamp: Date.now(),
    mealType: mealType || 'snack',

    // Aggregated Totals (calculated by backend)
    totals,

    // Health Assessment (ALWAYS calculated from actual nutrition data)
    healthScore,
    nutriScore,
    nutriScoreValue, // Raw score for detailed display (-15 to +40)
    healthAnalysis,

    // Individual Food Items (each has its own healthScore & nutriScore)
    items,

    // Smart Recommendations
    suggestions,

    // Data Quality
    dataQuality: {
      overallConfidence: Math.round(avgConfidence * 100) / 100,
      source: estimatedItems.length > verifiedItems.length ? 'ai_estimate' : 'verified',
      verifiedItemsCount: verifiedItems.length,
      estimatedItemsCount: estimatedItems.length
    }
  };
}

export default {
  buildUnifiedResponse,
  buildFoodItem,
  normalizeNutrition,
  calculateTotals
};
