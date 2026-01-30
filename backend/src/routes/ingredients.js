/**
 * INGREDIENT BREAKDOWN & MODIFICATION API
 *
 * Endpoints for:
 * 1. Getting full ingredient breakdown for any food
 * 2. Modifying ingredients (add/remove/substitute)
 * 3. Recalculating nutrition after modifications
 * 4. Getting customization suggestions
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { ingredientBreakdownService } from '../services/ingredientBreakdownService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(requireAuth);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ingredients/breakdown
// Get full ingredient breakdown for a food item
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/breakdown', aiLimiter, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { foodName, brand, region, existingNutrition } = req.body;

    if (!foodName) {
      return res.status(400).json({ error: 'foodName is required' });
    }

    // Detect region from user profile if not provided
    const effectiveRegion = region || req.headers['x-user-region'] || 'US';

    const breakdown = await ingredientBreakdownService.getIngredientBreakdown(
      foodName,
      {
        brand,
        region: effectiveRegion,
        existingNutrition,
        userId,
      }
    );

    // Add session ID for tracking modifications
    breakdown.sessionId = uuidv4();

    res.json({
      success: true,
      breakdown,
      meta: {
        foodName,
        brand: brand || 'generic',
        region: effectiveRegion,
        ingredientCount: breakdown.ingredients.length,
        isEditable: breakdown.isEditable,
      }
    });

  } catch (error) {
    console.error('[Ingredients] Breakdown error:', error);
    res.status(500).json({
      error: 'Failed to get ingredient breakdown',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ingredients/modify
// Apply modifications to an ingredient breakdown
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/modify', async (req, res) => {
  try {
    const { breakdown, modifications } = req.body;

    if (!breakdown || !modifications || !Array.isArray(modifications)) {
      return res.status(400).json({
        error: 'breakdown and modifications array are required'
      });
    }

    // Validate modifications
    for (const mod of modifications) {
      if (!['remove', 'add', 'modify', 'substitute'].includes(mod.action)) {
        return res.status(400).json({
          error: `Invalid modification action: ${mod.action}. Must be: remove, add, modify, or substitute`
        });
      }
    }

    const updatedBreakdown = ingredientBreakdownService.recalculateNutrition(
      breakdown,
      modifications
    );

    res.json({
      success: true,
      breakdown: updatedBreakdown,
      summary: {
        originalCalories: breakdown.totalNutrition?.calories || 0,
        newCalories: updatedBreakdown.totalNutrition?.calories || 0,
        calorieChange: (updatedBreakdown.totalNutrition?.calories || 0) - (breakdown.totalNutrition?.calories || 0),
        modificationsApplied: modifications.length,
      }
    });

  } catch (error) {
    console.error('[Ingredients] Modify error:', error);
    res.status(500).json({
      error: 'Failed to apply modifications',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ingredients/customize
// Apply a customization string (e.g., "no pickles", "extra cheese")
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/customize', async (req, res) => {
  try {
    const { breakdown, customization } = req.body;

    if (!breakdown || !customization) {
      return res.status(400).json({
        error: 'breakdown and customization string are required'
      });
    }

    const updatedBreakdown = ingredientBreakdownService.applyCustomization(
      breakdown,
      customization
    );

    res.json({
      success: true,
      breakdown: updatedBreakdown,
      customizationApplied: customization,
      summary: {
        originalCalories: breakdown.totalNutrition?.calories || 0,
        newCalories: updatedBreakdown.totalNutrition?.calories || 0,
        calorieChange: (updatedBreakdown.totalNutrition?.calories || 0) - (breakdown.totalNutrition?.calories || 0),
      }
    });

  } catch (error) {
    console.error('[Ingredients] Customize error:', error);
    res.status(500).json({
      error: 'Failed to apply customization',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ingredients/suggestions
// Get add-on suggestions for a food type
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/suggestions', async (req, res) => {
  try {
    const { breakdown, foodType } = req.body;

    if (!breakdown) {
      return res.status(400).json({ error: 'breakdown is required' });
    }

    const suggestions = ingredientBreakdownService.getSuggestedAddOns(breakdown);

    res.json({
      success: true,
      suggestions,
      foodType: foodType || 'auto-detected',
    });

  } catch (error) {
    console.error('[Ingredients] Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ingredients/remove
// Quick endpoint to remove a single ingredient
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/remove', async (req, res) => {
  try {
    const { breakdown, ingredientId } = req.body;

    if (!breakdown || !ingredientId) {
      return res.status(400).json({
        error: 'breakdown and ingredientId are required'
      });
    }

    const ingredient = breakdown.ingredients.find(ing => ing.id === ingredientId);
    if (!ingredient) {
      return res.status(404).json({
        error: `Ingredient with id ${ingredientId} not found`
      });
    }

    if (ingredient.isRemovable === false) {
      return res.status(400).json({
        error: `Ingredient "${ingredient.name}" cannot be removed`
      });
    }

    const updatedBreakdown = ingredientBreakdownService.recalculateNutrition(
      breakdown,
      [{ action: 'remove', ingredientId }]
    );

    res.json({
      success: true,
      breakdown: updatedBreakdown,
      removed: {
        name: ingredient.name,
        nutrition: ingredient.nutrition,
      },
      summary: {
        newCalories: updatedBreakdown.totalNutrition?.calories || 0,
        caloriesSaved: ingredient.nutrition?.calories || 0,
      }
    });

  } catch (error) {
    console.error('[Ingredients] Remove error:', error);
    res.status(500).json({
      error: 'Failed to remove ingredient',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ingredients/add
// Quick endpoint to add an ingredient
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/add', async (req, res) => {
  try {
    const { breakdown, ingredient } = req.body;

    if (!breakdown || !ingredient) {
      return res.status(400).json({
        error: 'breakdown and ingredient are required'
      });
    }

    // Validate ingredient has required fields
    if (!ingredient.name || !ingredient.nutrition) {
      return res.status(400).json({
        error: 'ingredient must have name and nutrition object'
      });
    }

    const updatedBreakdown = ingredientBreakdownService.recalculateNutrition(
      breakdown,
      [{ action: 'add', ingredient }]
    );

    res.json({
      success: true,
      breakdown: updatedBreakdown,
      added: {
        name: ingredient.name,
        nutrition: ingredient.nutrition,
      },
      summary: {
        newCalories: updatedBreakdown.totalNutrition?.calories || 0,
        caloriesAdded: ingredient.nutrition?.calories || 0,
      }
    });

  } catch (error) {
    console.error('[Ingredients] Add error:', error);
    res.status(500).json({
      error: 'Failed to add ingredient',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ingredients/database
// Get common ingredients from database (for UI autocomplete)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/database', async (req, res) => {
  try {
    const { category, search } = req.query;

    // Import the database
    const { INGREDIENT_NUTRITION_DB } = await import('../services/ingredientBreakdownService.js');

    let ingredients = Object.entries(INGREDIENT_NUTRITION_DB).map(([key, value]) => ({
      id: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      ...value,
    }));

    // Filter by category if provided
    if (category) {
      const categoryMap = {
        protein: ['beef', 'chicken', 'fish', 'egg', 'bacon', 'turkey', 'shrimp'],
        cheese: ['cheese', 'mozzarella', 'cheddar', 'parmesan', 'feta'],
        sauce: ['sauce', 'mayo', 'ketchup', 'mustard', 'dressing', 'salsa', 'guac'],
        vegetable: ['lettuce', 'tomato', 'onion', 'pickle', 'pepper', 'spinach', 'mushroom'],
        carb: ['bun', 'bread', 'tortilla', 'rice', 'fries', 'potato'],
        drink: ['soda', 'juice', 'milk', 'coffee'],
      };

      const keywords = categoryMap[category.toLowerCase()] || [];
      if (keywords.length > 0) {
        ingredients = ingredients.filter(ing =>
          keywords.some(kw => ing.id.includes(kw))
        );
      }
    }

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      ingredients = ingredients.filter(ing =>
        ing.id.includes(searchLower) || ing.name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      ingredients,
      count: ingredients.length,
    });

  } catch (error) {
    console.error('[Ingredients] Database error:', error);
    res.status(500).json({
      error: 'Failed to get ingredient database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ingredients/regions
// Get available regions and their adjustments
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/regions', async (req, res) => {
  try {
    const { REGIONAL_MULTIPLIERS } = await import('../services/ingredientBreakdownService.js');

    const regions = Object.entries(REGIONAL_MULTIPLIERS).map(([code, data]) => ({
      code,
      name: code,
      portionMultiplier: data.portionMultiplier,
      note: data.note,
      hasSubstitutions: !!data.commonSubstitutions,
      substitutions: data.commonSubstitutions || {},
    }));

    res.json({
      success: true,
      regions,
      defaultRegion: 'US',
    });

  } catch (error) {
    console.error('[Ingredients] Regions error:', error);
    res.status(500).json({
      error: 'Failed to get regions',
    });
  }
});

export default router;
