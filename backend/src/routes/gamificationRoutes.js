import express from 'express';
import { checkAndAwardStreakFreeze } from '../services/gamificationService.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// POST /api/gamification/check-streak
// Call this endpoint after successfully logging a meal or water that increments the streak
router.post('/check-streak', requireAuth, async (req, res) => {
  try {
    const { currentStreak } = req.body;
    const userId = req.user.id;

    if (typeof currentStreak !== 'number') {
      return res.status(400).json({ error: 'currentStreak is required' });
    }

    const result = await checkAndAwardStreakFreeze(userId, currentStreak);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check streak rewards' });
  }
});

export default router;