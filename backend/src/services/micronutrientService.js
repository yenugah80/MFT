/**
 * Micronutrient Service
 * Estimates vitamins and minerals for foods using USDA database + AI fallback
 * Provides comprehensive micronutrient breakdown for food recommendations
 */

import OpenAI from 'openai';
import axios from 'axios';
import { ENV } from '../config/env.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: ENV?.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  timeout: parseInt(process.env.OPENAI_TIMEOUT_MS) || 30000,
});

// Micronutrients definition with daily values (FDA/NIH standards)
export const MICRONUTRIENTS = {
  // Fat-soluble vitamins
  vitaminA: { unit: 'µg', dailyValue: 900, category: 'vitamin' },
  vitaminD: { unit: 'µg', dailyValue: 20, category: 'vitamin' },
  vitaminE: { unit: 'mg', dailyValue: 15, category: 'vitamin' },
  vitaminK: { unit: 'µg', dailyValue: 120, category: 'vitamin' },

  // Water-soluble vitamins
  vitaminC: { unit: 'mg', dailyValue: 90, category: 'vitamin' },
  vitaminB6: { unit: 'mg', dailyValue: 1.7, category: 'vitamin' },
  vitaminB12: { unit: 'µg', dailyValue: 2.4, category: 'vitamin' },
  folate: { unit: 'µg', dailyValue: 400, category: 'vitamin' },
  thiamine: { unit: 'mg', dailyValue: 1.2, category: 'vitamin' },
  riboflavin: { unit: 'mg', dailyValue: 1.3, category: 'vitamin' },
  niacin: { unit: 'mg', dailyValue: 16, category: 'vitamin' },
  pantothenicAcid: { unit: 'mg', dailyValue: 5, category: 'vitamin' },

  // Minerals
  calcium: { unit: 'mg', dailyValue: 1300, category: 'mineral' },
  iron: { unit: 'mg', dailyValue: 18, category: 'mineral' },
  magnesium: { unit: 'mg', dailyValue: 420, category: 'mineral' },
  phosphorus: { unit: 'mg', dailyValue: 1250, category: 'mineral' },
  potassium: { unit: 'mg', dailyValue: 4700, category: 'mineral' },
  sodium: { unit: 'mg', dailyValue: 2300, category: 'mineral' },
  zinc: { unit: 'mg', dailyValue: 11, category: 'mineral' },
  copper: { unit: 'mg', dailyValue: 0.9, category: 'mineral' },
  manganese: { unit: 'mg', dailyValue: 2.3, category: 'mineral' },
  iodine: { unit: 'µg', dailyValue: 150, category: 'mineral' },
  selenium: { unit: 'µg', dailyValue: 55, category: 'mineral' },
};

/**
 * Estimate micronutrients for a food using USDA database first, then AI
 * @param {string} foodName - Name of the food
 * @param {string} portion - Portion size (e.g., "150g", "1 cup")
 * @param {object} macros - Macro info { protein, carbs, fats, calories }
 * @returns {Promise<object>} Micronutrient estimates
 */
export async function estimateMicronutrients(foodName, portion, macros) {
  try {
    // Try USDA database first (fastest, most accurate)
    const usdaData = await tryUSDAEstimation(foodName, portion);
    if (usdaData && Object.keys(usdaData).length > 0) {
      return usdaData;
    }

    // Fallback to AI estimation
    return await tryAIEstimation(foodName, portion, macros);
  } catch (error) {
    console.error('[MicronutrientService] Estimation error:', error);
    // Return empty object on error - better to have partial data than fail
    return {};
  }
}

/**
 * Try to estimate micronutrients using USDA FoodData Central API
 */
async function tryUSDAEstimation(foodName, portion) {
  try {
    const USDA_API_KEY = process.env.USDA_API_KEY;
    if (!USDA_API_KEY) {
      console.log('[MicronutrientService] USDA API key not configured, skipping USDA lookup');
      return {};
    }

    // Search USDA database
    const searchUrl = `https://fdc.nal.usda.gov/api/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`;

    const searchResponse = await axios.get(searchUrl, { timeout: 2000 });
    const foods = searchResponse.data.foods;

    if (!foods || foods.length === 0) {
      console.log(`[MicronutrientService] No USDA match found for: ${foodName}`);
      return {};
    }

    const food = foods[0];
    const fdcId = food.fdcId;

    // Get detailed nutrient data
    const detailUrl = `https://fdc.nal.usda.gov/api/foods/${fdcId}?api_key=${USDA_API_KEY}`;
    const detailResponse = await axios.get(detailUrl, { timeout: 2000 });

    const nutrients = detailResponse.data.foodNutrients || [];
    const micros = {};

    // Map USDA nutrients to our micronutrient structure
    for (const nutrient of nutrients) {
      const nutrientName = nutrient.nutrient.name.toLowerCase();

      // Map common nutrient names
      if (nutrientName.includes('vitamin a')) micros.vitaminA = Math.round(nutrient.amount);
      else if (nutrientName.includes('vitamin c')) micros.vitaminC = Math.round(nutrient.amount);
      else if (nutrientName.includes('vitamin d')) micros.vitaminD = Math.round(nutrient.amount);
      else if (nutrientName.includes('vitamin e')) micros.vitaminE = Math.round(nutrient.amount * 100) / 100;
      else if (nutrientName.includes('vitamin k')) micros.vitaminK = Math.round(nutrient.amount);
      else if (nutrientName.includes('vitamin b6')) micros.vitaminB6 = Math.round(nutrient.amount * 100) / 100;
      else if (nutrientName.includes('vitamin b12')) micros.vitaminB12 = Math.round(nutrient.amount * 100) / 100;
      else if (nutrientName.includes('folate')) micros.folate = Math.round(nutrient.amount);
      else if (nutrientName.includes('calcium')) micros.calcium = Math.round(nutrient.amount);
      else if (nutrientName.includes('iron') && !nutrientName.includes('ferric')) micros.iron = Math.round(nutrient.amount * 100) / 100;
      else if (nutrientName.includes('magnesium')) micros.magnesium = Math.round(nutrient.amount);
      else if (nutrientName.includes('phosphorus')) micros.phosphorus = Math.round(nutrient.amount);
      else if (nutrientName.includes('potassium')) micros.potassium = Math.round(nutrient.amount);
      else if (nutrientName.includes('sodium')) micros.sodium = Math.round(nutrient.amount);
      else if (nutrientName.includes('zinc')) micros.zinc = Math.round(nutrient.amount * 100) / 100;
      else if (nutrientName.includes('copper')) micros.copper = Math.round(nutrient.amount * 1000) / 1000;
      else if (nutrientName.includes('manganese')) micros.manganese = Math.round(nutrient.amount * 100) / 100;
      else if (nutrientName.includes('iodine')) micros.iodine = Math.round(nutrient.amount);
      else if (nutrientName.includes('selenium')) micros.selenium = Math.round(nutrient.amount);
    }

    console.log(`[MicronutrientService] USDA lookup successful for: ${foodName}, found ${Object.keys(micros).length} nutrients`);
    return micros;
  } catch (error) {
    console.error('[MicronutrientService] USDA estimation failed:', error.message);
    return {};
  }
}

/**
 * Estimate micronutrients using AI (GPT-4o-mini)
 */
async function tryAIEstimation(foodName, portion, macros) {
  try {
    const prompt = `You are a nutrition expert. Estimate the micronutrient content for the following food:

Food: ${foodName}
Portion: ${portion}
Macronutrients: ${macros.calories} kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fats}g fat

Provide realistic estimates for these micronutrients. Use standard units:
- Vitamins in: A (µg), C/E (mg), D/K (µg), B-vitamins (mg)
- Minerals in: mg except iodine/selenium (µg)

Return ONLY valid JSON with nutrient names as keys and numeric values. Example:
{
  "vitaminA": 500,
  "vitaminC": 45,
  "calcium": 300,
  "iron": 2.5,
  "zinc": 1.2
}

Only include nutrients where you have reasonable confidence.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[MicronutrientService] AI response did not contain valid JSON');
      return {};
    }

    const micros = JSON.parse(jsonMatch[0]);

    // Validate and clean micronutrients
    const validMicros = {};
    for (const [key, value] of Object.entries(micros)) {
      if (MICRONUTRIENTS[key] && typeof value === 'number' && value > 0) {
        validMicros[key] = value;
      }
    }

    console.log(`[MicronutrientService] AI estimation for: ${foodName}, estimated ${Object.keys(validMicros).length} nutrients`);
    return validMicros;
  } catch (error) {
    console.error('[MicronutrientService] AI estimation failed:', error.message);
    return {};
  }
}

/**
 * Calculate percentage of daily value for a micronutrient
 */
export function calculateDailyValuePercent(micronutrientKey, amount) {
  const micro = MICRONUTRIENTS[micronutrientKey];
  if (!micro) return null;

  const percent = Math.round((amount / micro.dailyValue) * 100);
  return percent;
}

/**
 * Format micronutrient display value
 */
export function formatMicronutrientValue(micronutrientKey, amount) {
  const micro = MICRONUTRIENTS[micronutrientKey];
  if (!micro) return `${amount}`;

  // Round based on typical values
  const rounded = amount < 1 ?
    Math.round(amount * 1000) / 1000 :
    Math.round(amount);

  return `${rounded}${micro.unit}`;
}

/**
 * Get micronutrient display name
 */
export function getMicronutrientName(key) {
  const names = {
    vitaminA: 'Vitamin A',
    vitaminD: 'Vitamin D',
    vitaminE: 'Vitamin E',
    vitaminK: 'Vitamin K',
    vitaminC: 'Vitamin C',
    vitaminB6: 'Vitamin B6',
    vitaminB12: 'Vitamin B12',
    folate: 'Folate',
    thiamine: 'Thiamine (B1)',
    riboflavin: 'Riboflavin (B2)',
    niacin: 'Niacin (B3)',
    pantothenicAcid: 'Pantothenic Acid',
    calcium: 'Calcium',
    iron: 'Iron',
    magnesium: 'Magnesium',
    phosphorus: 'Phosphorus',
    potassium: 'Potassium',
    sodium: 'Sodium',
    zinc: 'Zinc',
    copper: 'Copper',
    manganese: 'Manganese',
    iodine: 'Iodine',
    selenium: 'Selenium',
  };

  return names[key] || key;
}

/**
 * Filter micronutrients to show only significant ones (>10% DV)
 */
export function getSignificantMicronutrients(micros) {
  const significant = {};

  for (const [key, value] of Object.entries(micros)) {
    const percent = calculateDailyValuePercent(key, value);
    if (percent && percent >= 10) {
      significant[key] = value;
    }
  }

  return significant;
}

/**
 * Get recommended micronutrients to display based on food category
 */
export function getRecommendedMicros(foodCategory) {
  const recommendations = {
    dairy: ['calcium', 'vitaminD', 'vitaminB12', 'phosphorus'],
    meat: ['iron', 'zinc', 'vitaminB12', 'vitaminB6', 'selenium'],
    vegetable: ['vitaminA', 'vitaminC', 'potassium', 'folate'],
    fruit: ['vitaminC', 'potassium', 'folate'],
    grain: ['iron', 'magnesium', 'thiamine', 'niacin'],
    legume: ['iron', 'zinc', 'folate', 'magnesium'],
    nut: ['magnesium', 'zinc', 'copper', 'manganese'],
  };

  return recommendations[foodCategory] || [];
}
