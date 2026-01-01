/**
 * Recipe Service
 * Generates cooking instructions and prep time estimates for recommended foods
 * Uses AI to create realistic, safe recipes
 */

import OpenAI from 'openai';
import { ENV } from '../config/env.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: ENV?.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  timeout: parseInt(process.env.OPENAI_TIMEOUT_MS) || 30000,
});

/**
 * Generate recipe instructions for a food
 * @param {string} foodName - Name of the food/dish
 * @param {string} portion - Portion size
 * @param {array} ingredients - List of ingredients (optional)
 * @returns {Promise<object>} Recipe data with instructions, times, difficulty
 */
export async function generateRecipeInstructions(foodName, portion, ingredients = []) {
  try {
    const ingredientList = ingredients.length > 0 ?
      `Ingredients: ${ingredients.join(', ')}\n` :
      '';

    const prompt = `You are a professional culinary expert. Generate concise cooking instructions for: "${foodName}" (${portion})

${ingredientList}
Create realistic, safe, beginner-friendly instructions. Include:
1. Clear, numbered steps (3-7 steps max)
2. Estimated prep and cook times
3. Difficulty level
4. One safety tip if relevant

Return ONLY valid JSON (no markdown):
{
  "steps": ["step 1", "step 2"],
  "prepTimeMinutes": 5,
  "cookTimeMinutes": 10,
  "totalTimeMinutes": 15,
  "difficulty": "easy",
  "safetyTip": "..."
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      temperature: 0.4, // Lower for consistency
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
      console.log('[RecipeService] AI response did not contain valid JSON');
      return getDefaultRecipe(foodName);
    }

    const recipe = JSON.parse(jsonMatch[0]);

    // Validate and clean recipe data
    const validated = validateRecipeData(recipe);

    console.log(`[RecipeService] Generated recipe for: ${foodName}`);
    return validated;
  } catch (error) {
    console.error('[RecipeService] Recipe generation error:', error.message);
    return getDefaultRecipe(foodName);
  }
}

/**
 * Validate and clean recipe data
 */
function validateRecipeData(recipe) {
  const validated = {
    steps: [],
    prepTimeMinutes: 5,
    cookTimeMinutes: 5,
    totalTimeMinutes: 10,
    difficulty: 'easy',
    safetyTip: null,
    instructions: '' // For legacy format
  };

  // Validate steps
  if (Array.isArray(recipe.steps)) {
    validated.steps = recipe.steps
      .filter(step => typeof step === 'string' && step.length > 0 && step.length < 200)
      .slice(0, 7); // Max 7 steps
  }

  // Format as single instruction string
  if (validated.steps.length > 0) {
    validated.instructions = validated.steps
      .map((step, i) => `${i + 1}. ${step}`)
      .join('\n');
  }

  // Validate times
  if (Number.isInteger(recipe.prepTimeMinutes) && recipe.prepTimeMinutes > 0 && recipe.prepTimeMinutes <= 120) {
    validated.prepTimeMinutes = recipe.prepTimeMinutes;
  }

  if (Number.isInteger(recipe.cookTimeMinutes) && recipe.cookTimeMinutes > 0 && recipe.cookTimeMinutes <= 240) {
    validated.cookTimeMinutes = recipe.cookTimeMinutes;
  }

  validated.totalTimeMinutes = validated.prepTimeMinutes + validated.cookTimeMinutes;

  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (validDifficulties.includes(recipe.difficulty)) {
    validated.difficulty = recipe.difficulty;
  }

  // Validate safety tip
  if (typeof recipe.safetyTip === 'string' && recipe.safetyTip.length > 0 && recipe.safetyTip.length < 200) {
    validated.safetyTip = recipe.safetyTip;
  }

  return validated;
}

/**
 * Get default recipe template when AI generation fails
 */
function getDefaultRecipe(foodName) {
  return {
    steps: [
      'Gather all ingredients and cooking equipment',
      'Prepare ingredients as needed (wash, chop, measure)',
      'Follow the standard cooking method for this food',
      'Cook until done, adjust seasonings as needed',
      'Plate and serve immediately'
    ],
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'easy',
    safetyTip: 'Handle food safely, keep work surface clean',
    instructions: `1. Gather all ingredients and cooking equipment\n2. Prepare ingredients as needed (wash, chop, measure)\n3. Follow the standard cooking method for this food\n4. Cook until done, adjust seasonings as needed\n5. Plate and serve immediately`
  };
}

/**
 * Estimate prep time based on food complexity
 * Used for quick estimation without AI call
 */
export function estimatePrepTime(foodName) {
  const complexityMap = {
    // Simple foods (5-10 min)
    'simple': ['apple', 'banana', 'bread', 'toast', 'sandwich', 'salad', 'yogurt', 'juice', 'smoothie'],
    // Medium foods (10-20 min)
    'medium': ['rice', 'pasta', 'egg', 'chicken', 'fish', 'soup', 'curry', 'stew', 'stir-fry', 'pizza'],
    // Complex foods (20+ min)
    'complex': ['cake', 'bread', 'pie', 'casserole', 'roast', 'dessert', 'sauce', 'pastry']
  };

  const lower = foodName.toLowerCase();

  for (const [complexity, foods] of Object.entries(complexityMap)) {
    if (foods.some(food => lower.includes(food))) {
      if (complexity === 'simple') return { prepTimeMinutes: 5, cookTimeMinutes: 5 };
      if (complexity === 'medium') return { prepTimeMinutes: 10, cookTimeMinutes: 15 };
      if (complexity === 'complex') return { prepTimeMinutes: 15, cookTimeMinutes: 30 };
    }
  }

  // Default
  return { prepTimeMinutes: 10, cookTimeMinutes: 15 };
}

/**
 * Get cooking methods for different food types
 */
export function getCommonCookingMethods(foodName) {
  const methods = {
    chicken: ['grilled', 'baked', 'pan-fried', 'boiled'],
    fish: ['grilled', 'baked', 'pan-fried', 'steamed'],
    rice: ['boiled', 'steamed', 'fried'],
    vegetable: ['steamed', 'roasted', 'grilled', 'raw'],
    egg: ['fried', 'boiled', 'scrambled', 'poached'],
    meat: ['grilled', 'roasted', 'braised', 'pan-fried'],
  };

  const lower = foodName.toLowerCase();

  for (const [foodType, cookingMethods] of Object.entries(methods)) {
    if (lower.includes(foodType)) {
      return cookingMethods;
    }
  }

  return ['grilled', 'baked', 'steamed'];
}

/**
 * Format recipe for display
 */
export function formatRecipeForDisplay(recipe) {
  return {
    ...recipe,
    displayTime: `${recipe.totalTimeMinutes}m (${recipe.prepTimeMinutes}m prep + ${recipe.cookTimeMinutes}m cook)`,
    difficultyLabel: recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1),
    stepCount: recipe.steps?.length || 0
  };
}

/**
 * Validate ingredients list
 */
export function validateIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];

  return ingredients
    .filter(ing => typeof ing === 'string' && ing.length > 0 && ing.length < 100)
    .slice(0, 20); // Max 20 ingredients
}
