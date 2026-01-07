/**
 * Ingredient Parser Service
 * Parses raw ingredient text from product labels into structured ingredients with nutrition
 *
 * Uses OpenAI to intelligently parse ingredient lists and estimate per-ingredient nutrition
 * based on the total product nutrition.
 */

import { openaiClient } from './apiClients/OpenAIClient.js';

/**
 * Parse raw ingredient text into structured ingredients with estimated nutrition
 *
 * @param {string} ingredientsText - Raw ingredient text from product label
 * @param {object} productNutrition - Total product nutrition { calories, protein, carbs, fat }
 * @param {object} options - Additional options
 * @returns {Promise<Array>} Array of structured ingredients with nutrition
 */
export async function parseIngredientsText(ingredientsText, productNutrition, options = {}) {
  if (!ingredientsText || ingredientsText.length < 10) {
    return [];
  }

  const { servingSize = '100g' } = options;

  try {
    const messages = [
      {
        role: 'system',
        content: `You are a nutrition expert that parses ingredient lists from food labels.

Given a raw ingredient list and total product nutrition, break down into individual ingredients with estimated nutrition.

RULES:
1. Ingredients are typically listed in descending order by weight
2. First 3-5 ingredients usually account for 70-80% of the product
3. Distribute nutrition proportionally based on ingredient order
4. Account for ingredient types (proteins contribute protein, grains contribute carbs, oils contribute fat)
5. Sum of ingredient nutrition should approximately equal total product nutrition
6. Maximum 10 main ingredients (group minor ingredients like "spices" together)

Return JSON only:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "portion": "estimated amount",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "isMainIngredient": boolean
    }
  ],
  "confidence": 0.0-1.0,
  "notes": "any parsing notes"
}`
      },
      {
        role: 'user',
        content: `Parse this ingredient list:

INGREDIENTS: ${ingredientsText}

TOTAL PRODUCT NUTRITION (per ${servingSize}):
- Calories: ${productNutrition.calories || 0} kcal
- Protein: ${productNutrition.protein || 0}g
- Carbs: ${productNutrition.carbs || 0}g
- Fat: ${productNutrition.fat || 0}g

Break down into individual ingredients with estimated nutrition that sums to the total.`
      }
    ];

    const response = await openaiClient.chatCompletionJSON(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 800,
    });

    if (!response.ingredients || !Array.isArray(response.ingredients)) {
      console.warn('[IngredientParser] Invalid response format');
      return [];
    }

    // Validate and normalize ingredients
    const validatedIngredients = response.ingredients
      .filter(ing => ing && ing.name && ing.name.length > 0)
      .map(ing => ({
        name: String(ing.name).trim().substring(0, 100),
        portion: String(ing.portion || '').substring(0, 50) || 'varies',
        calories: Math.max(0, Math.round(Number(ing.calories) || 0)),
        protein: Math.max(0, Math.round((Number(ing.protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(ing.carbs) || 0) * 10) / 10),
        fat: Math.max(0, Math.round((Number(ing.fat) || 0) * 10) / 10),
        isMainIngredient: ing.isMainIngredient === true,
      }))
      .slice(0, 15); // Max 15 ingredients

    // Validate that nutrition sums are reasonable (within 30% of total)
    const totalParsedCalories = validatedIngredients.reduce((sum, i) => sum + i.calories, 0);
    const expectedCalories = productNutrition.calories || 0;

    if (expectedCalories > 0) {
      const diff = Math.abs(totalParsedCalories - expectedCalories) / expectedCalories;
      if (diff > 0.3) {
        console.warn(
          `[IngredientParser] Nutrition sum mismatch: parsed ${totalParsedCalories} kcal vs expected ${expectedCalories} kcal (${(diff * 100).toFixed(0)}% diff)`
        );
      }
    }

    console.log(`[IngredientParser] Parsed ${validatedIngredients.length} ingredients from label text`);

    return validatedIngredients;

  } catch (error) {
    console.error('[IngredientParser] Failed to parse ingredients:', error.message);

    // Fallback: Return simple parsed list without nutrition
    return parseSimpleIngredientsList(ingredientsText);
  }
}

/**
 * Simple fallback parser - just extract ingredient names
 * Used when AI parsing fails
 */
function parseSimpleIngredientsList(text) {
  if (!text) return [];

  // Common separators in ingredient lists
  const ingredients = text
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 100)
    .map(name => ({
      name: name.replace(/[()[\]{}]/g, '').trim(),
      portion: 'varies',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      isMainIngredient: false,
    }))
    .slice(0, 20);

  // Mark first 3 as main ingredients (typically highest quantity)
  ingredients.slice(0, 3).forEach(ing => {
    ing.isMainIngredient = true;
  });

  return ingredients;
}

/**
 * Check if ingredient text is worth parsing
 * (Skip very short or empty lists)
 */
export function shouldParseIngredients(text) {
  if (!text || typeof text !== 'string') return false;

  const cleaned = text.trim();

  // Need at least 20 chars and contain a comma (multiple ingredients)
  return cleaned.length >= 20 && cleaned.includes(',');
}

export default {
  parseIngredientsText,
  shouldParseIngredients,
};
