/**
 * Multi-Task Learning Predictions API
 *
 * Exposes MTL prediction and personalization endpoints.
 * Designed for frontend consumption with proper response formatting.
 *
 * ENDPOINTS:
 * - GET /mtl/predict - Get predictions for current user
 * - GET /mtl/predict/:date - Get predictions for specific date
 * - GET /mtl/status - Get personalization status
 * - POST /mtl/update - Trigger model personalization update
 * - GET /mtl/insights - Get model insights for visualization
 * - GET /mtl/forecast - Get multi-day forecast
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

import {
  predictHealthOutcomes,
  getPersonalizationStatus,
  updateUserModel,
  getModelInsights,
} from '../services/mtl/index.js';

const router = express.Router();

/**
 * ============================================
 * PREDICTION ENDPOINTS
 * ============================================
 */

/**
 * GET /mtl/predict
 * Get health outcome predictions for today
 */
router.get('/predict', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const result = await predictHealthOutcomes(userId);

    res.json(result);
  } catch (error) {
    console.error('[MTL API] Error getting predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate predictions',
      message: error.message,
    });
  }
});

/**
 * GET /mtl/predict/:date
 * Get health outcome predictions for a specific date
 */
router.get('/predict/:date', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date } = req.params;

    // Validate date format
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const result = await predictHealthOutcomes(userId, targetDate);

    res.json(result);
  } catch (error) {
    console.error('[MTL API] Error getting predictions for date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate predictions',
      message: error.message,
    });
  }
});

/**
 * GET /mtl/forecast
 * Get multi-day forecast (next 3 days)
 */
router.get('/forecast', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const days = parseInt(req.query.days) || 3;

    const forecasts = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);

      const result = await predictHealthOutcomes(userId, forecastDate);

      if (result.success) {
        forecasts.push({
          date: forecastDate.toISOString().split('T')[0],
          dayLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${i + 1}`,
          predictions: result.predictions,
        });
      }
    }

    res.json({
      success: true,
      userId,
      forecast: forecasts,
      personalization: forecasts[0]?.personalization,
    });
  } catch (error) {
    console.error('[MTL API] Error generating forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate forecast',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * PERSONALIZATION ENDPOINTS
 * ============================================
 */

/**
 * GET /mtl/status
 * Get personalization status and progress
 */
router.get('/status', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const result = await getPersonalizationStatus(userId);

    res.json(result);
  } catch (error) {
    console.error('[MTL API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get personalization status',
      message: error.message,
    });
  }
});

/**
 * POST /mtl/update
 * Trigger model personalization update
 */
router.post('/update', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const result = await updateUserModel(userId);

    res.json(result);
  } catch (error) {
    console.error('[MTL API] Error updating model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model',
      message: error.message,
    });
  }
});

/**
 * GET /mtl/insights
 * Get model insights for visualization
 */
router.get('/insights', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const result = await getModelInsights(userId);

    res.json(result);
  } catch (error) {
    console.error('[MTL API] Error getting insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model insights',
      message: error.message,
    });
  }
});

export default router;
