import express from 'express';
import { SavedMeal } from '../models/SavedMeal.js';
import { requireAuth } from '../middleware/auth.js'; // Assuming you have auth middleware

const router = express.Router();

/**
 * Save a new meal template
 * POST /api/meals/save
 */
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { name, description, items, totals } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!name || !items || items.length === 0) {
      return res.status(400).json({ error: "Name and items are required" });
    }

    const newMeal = new SavedMeal({
      userId,
      name,
      description,
      items,
      totals
    });

    await newMeal.save();

    res.status(201).json({ success: true, data: newMeal });
  } catch (error) {
    console.error("[SavedMeals] Create error:", error);
    res.status(500).json({ error: "Failed to save meal template" });
  }
});

/**
 * Get user's saved meals
 * GET /api/meals
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const meals = await SavedMeal.find({ userId: req.user.id }).sort({ lastUsedAt: -1 });
    res.json({ success: true, data: meals });
  } catch (error) {
    console.error("[SavedMeals] Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch saved meals" });
  }
});

/**
 * Delete a saved meal
 * DELETE /api/savedMeals/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await SavedMeal.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Meal not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[SavedMeals] Delete error:", error);
    res.status(500).json({ error: "Failed to delete meal" });
  }
});

export default router;